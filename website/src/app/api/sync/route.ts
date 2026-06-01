import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Business from '@/models/Business';
import Product from '@/models/Product';
import Transaction from '@/models/Transaction';
import POSUser from '@/models/POSUser';
import CreditCustomer from '@/models/CreditCustomer';
import Category from '@/models/Category';
import Expense from '@/models/Expense';

function getLastSyncAt(headers: Headers): Date | null {
  const lastSyncAtStr = headers.get('lastSyncAt');
  if (lastSyncAtStr) {
    try {
      return new Date(lastSyncAtStr);
    } catch (e) {
      console.error('Invalid lastSyncAt:', e);
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const apiKey = authHeader.substring(7);
    
    const business = await Business.findOne({ apiKey });
    if (!business) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const lastSyncAt = getLastSyncAt(request.headers);
    
    const query: any = { businessId: business._id };
    if (lastSyncAt) {
      query.updatedAt = { $gt: lastSyncAt };
    }

    const [products, transactions, users, creditCustomers, categories, expenses] = await Promise.all([
      Product.find(query),
      Transaction.find(query).sort({ timestamp: -1 }),
      POSUser.find(query),
      CreditCustomer.find(query),
      Category.find(query),
      Expense.find(query),
    ]);

    const formattedProducts = products.map(p => ({
      id: p.sku ? parseInt(p.sku) : p._id,
      productId: p.sku ? parseInt(p.sku) : p._id,
      name: p.name,
      price: p.price,
      category: p.category || 'Others',
      image: p.image || '',
      available: p.isActive ?? true,
      stock: p.quantity,
      minStock: p.lowStockAlert,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }));

    const formattedTransactions = transactions.map(t => ({
      id: t.transactionId,
      timestamp: t.timestamp?.toISOString() || new Date(t.createdAt).toISOString(),
      items: t.items.map((i: any) => ({
        product: {
          id: i.sku ? parseInt(i.sku) : i.productId,
          name: i.name,
          price: i.price
        },
        quantity: i.quantity
      })),
      subtotal: t.subtotal,
      tax: t.tax,
      total: t.total,
      paymentMethod: t.paymentMethod,
      cashier: t.cashier,
      creditCustomer: t.customer,
      status: t.status,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt
    }));

    const formattedUsers = users.map(u => ({
      id: u._id,
      name: u.name || u.username,
      pin: u.pin,
      role: u.role || 'cashier',
      isActive: u.isActive ?? true,
      createdAt: u.createdAt
    }));

    const formattedCreditCustomers = creditCustomers.map(c => ({
      id: c._id,
      name: c.name,
      phone: c.phone || '',
      totalCredit: c.totalCredit || 0,
      paidAmount: c.paidAmount || 0,
      balance: c.balance || 0,
      transactions: [],
      createdAt: c.createdAt,
      lastUpdated: c.updatedAt
    }));

    const formattedCategories = categories.map(c => ({
      id: c._id,
      name: c.name,
      description: c.description || '',
      color: c.color || '#3B82F6',
      isActive: c.isActive ?? true,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    }));

    const formattedExpenses = expenses.map(e => ({
      id: e._id,
      description: e.description,
      amount: e.amount,
      category: e.category,
      date: e.date,
      notes: e.notes || '',
      createdAt: e.createdAt,
      updatedAt: e.updatedAt
    }));

    return NextResponse.json({
      products: formattedProducts,
      transactions: formattedTransactions,
      users: formattedUsers,
      creditCustomers: formattedCreditCustomers,
      categories: formattedCategories,
      expenses: formattedExpenses,
      salaries: [],
      suppliers: [],
      loyaltyCustomers: [],
      lastSyncAt: new Date().toISOString(),
    }, { status: 200 });
  } catch (error) {
    console.error('Sync GET error:', error);
    return NextResponse.json({ error: 'Failed to sync' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const apiKey = authHeader.substring(7);
    
    const business = await Business.findOne({ apiKey });
    if (!business) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const body = await request.json();
    
    // Handle both formats: old (operation queue) and new (data objects)
    if (Array.isArray(body)) {
      // Old format: operation queue
      for (const op of body) {
        try {
          switch (op.type) {
            case 'new-transaction':
            case 'transaction': {
              const txData = op.data;
              await Transaction.findOneAndUpdate(
                { businessId: business._id, transactionId: txData.id },
                {
                  businessId: business._id,
                  transactionId: txData.id,
                  type: 'sale',
                  timestamp: new Date(txData.timestamp),
                  items: txData.items.map((item: any) => ({
                    name: item.product.name,
                    sku: String(item.product.id),
                    quantity: item.quantity,
                    price: item.product.price,
                    total: item.product.price * item.quantity
                  })),
                  subtotal: txData.subtotal,
                  tax: txData.tax,
                  total: txData.total,
                  paymentMethod: txData.paymentMethod,
                  cashier: txData.cashier,
                  customer: txData.creditCustomer,
                  status: txData.status,
                },
                { upsert: true, new: true }
              );
              break;
            }
            case 'update-transaction': {
              await Transaction.findOneAndUpdate(
                { businessId: business._id, transactionId: op.data.id },
                { ...op.data.updates, updatedAt: new Date() }
              );
              break;
            }
            case 'add-product':
            case 'update-product': {
              const prodData = op.data;
              await Product.findOneAndUpdate(
                { businessId: business._id, sku: prodData.id?.toString() || prodData.sku },
                {
                  businessId: business._id,
                  sku: prodData.id?.toString() || prodData.sku || `SKU${Date.now()}`,
                  name: prodData.name,
                  price: prodData.price,
                  category: prodData.category || 'Others',
                  image: prodData.image || '',
                  available: prodData.available ?? true,
                  stock: prodData.stock,
                  minStock: prodData.minStock,
                },
                { upsert: true, new: true }
              );
              break;
            }
            case 'add-user':
            case 'update-user': {
              const userData = op.data;
              await POSUser.findOneAndUpdate(
                { businessId: business._id, username: userData.name },
                {
                  businessId: business._id,
                  username: userData.name,
                  name: userData.name,
                  pin: userData.pin,
                  role: userData.role || 'cashier',
                  isActive: userData.isActive ?? true,
                },
                { upsert: true, new: true }
              );
              break;
            }
            case 'add-credit-customer':
            case 'update-credit-customer': {
              const custData = op.data;
              await CreditCustomer.findOneAndUpdate(
                { businessId: business._id, $or: [{ email: custData.email }, { phone: custData.phone }, { name: custData.name }] },
                {
                  businessId: business._id,
                  name: custData.name,
                  phone: custData.phone || '',
                  email: custData.email || '',
                  totalCredit: custData.totalCredit || 0,
                  paidAmount: custData.paidAmount || 0,
                  balance: custData.balance || 0,
                },
                { upsert: true, new: true }
              );
              break;
            }
            default:
              console.log('Unhandled operation type:', op.type);
          }
        } catch (opError) {
          console.error('Error processing operation:', op, opError);
        }
      }
    } else {
      // New format: data objects
      const { products, transactions, users, creditCustomers } = body;
      
      if (products && Array.isArray(products)) {
        for (const prod of products) {
          await Product.findOneAndUpdate(
            { businessId: business._id, sku: prod.sku },
            {
              businessId: business._id,
              ...prod,
            },
            { upsert: true, new: true }
          );
        }
      }
      
      if (transactions && Array.isArray(transactions)) {
        for (const tx of transactions) {
          await Transaction.findOneAndUpdate(
            { businessId: business._id, transactionId: tx.transactionId },
            {
              businessId: business._id,
              ...tx,
            },
            { upsert: true, new: true }
          );
        }
      }
      
      if (users && Array.isArray(users)) {
        for (const user of users) {
          await POSUser.findOneAndUpdate(
            { businessId: business._id, username: user.username },
            {
              businessId: business._id,
              ...user,
            },
            { upsert: true, new: true }
          );
        }
      }
      
      if (creditCustomers && Array.isArray(creditCustomers)) {
        for (const cust of creditCustomers) {
          await CreditCustomer.findOneAndUpdate(
            { businessId: business._id, $or: [{ email: cust.email }, { phone: cust.phone }] },
            {
              businessId: business._id,
              ...cust,
            },
            { upsert: true, new: true }
          );
        }
      }
    }

    const lastSyncAt = new Date();
    const [newProducts, newTransactions, newUsers, newCreditCustomers] = await Promise.all([
      Product.find({ businessId: business._id, updatedAt: { $gt: lastSyncAt } }),
      Transaction.find({ businessId: business._id, updatedAt: { $gt: lastSyncAt } }),
      POSUser.find({ businessId: business._id, updatedAt: { $gt: lastSyncAt } }),
      CreditCustomer.find({ businessId: business._id, updatedAt: { $gt: lastSyncAt } }),
    ]);

    return NextResponse.json({
      success: true,
      products: newProducts,
      transactions: newTransactions,
      users: newUsers,
      creditCustomers: newCreditCustomers,
      lastSyncAt: lastSyncAt.toISOString(),
    }, { status: 200 });
  } catch (error) {
    console.error('Sync POST error:', error);
    return NextResponse.json({ error: 'Failed to sync' }, { status: 500 });
  }
}
