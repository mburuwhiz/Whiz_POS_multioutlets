import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Business from '@/models/Business';
import Product from '@/models/Product';
import Transaction from '@/models/Transaction';
import POSUser from '@/models/POSUser';
import CreditCustomer from '@/models/CreditCustomer';

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

    const data = await request.json();
    let syncedCount = 0;
    let failedCount = 0;
    
    // Sync products
    if (data.products && Array.isArray(data.products)) {
      for (const prod of data.products) {
        try {
          await Product.findOneAndUpdate(
            { businessId: business._id, sku: prod.sku || prod.id?.toString() },
            {
              businessId: business._id,
              sku: prod.sku || prod.id?.toString() || `SKU${Date.now()}`,
              name: prod.name,
              price: prod.price,
              category: prod.category || 'Others',
              image: prod.image || '',
              isActive: prod.available ?? true,
              quantity: prod.stock,
              lowStockAlert: prod.minStock,
            },
            { upsert: true, returnDocument: 'after' }
          );
          syncedCount++;
        } catch (err: any) {
          console.error('Failed to sync product:', prod, err);
          failedCount++;
        }
      }
    }
    
    // Sync transactions
    if (data.transactions && Array.isArray(data.transactions)) {
      for (const tx of data.transactions) {
        try {
          await Transaction.findOneAndUpdate(
            { businessId: business._id, transactionId: tx.id || tx.transactionId },
            {
              businessId: business._id,
              transactionId: tx.id || tx.transactionId,
              type: 'sale',
              timestamp: tx.timestamp ? new Date(tx.timestamp) : new Date(),
              items: tx.items?.map((item: any) => ({
                name: item.product?.name || item.name,
                sku: String(item.product?.id || item.productId || item.sku),
                quantity: item.quantity,
                price: item.product?.price || item.price,
                total: item.total || (item.product?.price || item.price) * item.quantity
              })) || [],
              subtotal: tx.subtotal,
              tax: tx.tax,
              total: tx.total,
              paymentMethod: tx.paymentMethod,
              cashier: tx.cashier,
              customer: tx.creditCustomer || tx.customer,
              status: tx.status,
            },
            { upsert: true, returnDocument: 'after' }
          );
          syncedCount++;
        } catch (err: any) {
          console.error('Failed to sync transaction:', tx, err);
          failedCount++;
        }
      }
    }
    
    // Sync users
    if (data.users && Array.isArray(data.users)) {
      for (const user of data.users) {
        try {
          await POSUser.findOneAndUpdate(
            { businessId: business._id, username: user.name || user.username },
            {
              businessId: business._id,
              username: user.name || user.username,
              name: user.name || user.username,
              pin: user.pin,
              role: user.role || 'cashier',
              isActive: user.isActive ?? true,
            },
            { upsert: true, returnDocument: 'after' }
          );
          syncedCount++;
        } catch (err: any) {
          console.error('Failed to sync user:', user, err);
          failedCount++;
        }
      }
    }
    
    // Sync credit customers
    if (data.customers && Array.isArray(data.customers)) {
      for (const cust of data.customers) {
        try {
          await CreditCustomer.findOneAndUpdate(
            { businessId: business._id, $or: [{ email: cust.email }, { phone: cust.phone }, { name: cust.name }] },
            {
              businessId: business._id,
              name: cust.name,
              phone: cust.phone || '',
              email: cust.email || '',
              totalCredit: cust.totalCredit || 0,
              paidAmount: cust.paidAmount || 0,
              balance: cust.balance || 0,
            },
            { upsert: true, returnDocument: 'after' }
          );
          syncedCount++;
        } catch (err: any) {
          console.error('Failed to sync credit customer:', cust, err);
          failedCount++;
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Full sync complete',
      syncedCount,
      failedCount
    }, { status: 200 });
  } catch (error: any) {
    console.error('Full Sync Error:', error);
    return NextResponse.json({ error: error.message || 'Full sync failed' }, { status: 500 });
  }
}
