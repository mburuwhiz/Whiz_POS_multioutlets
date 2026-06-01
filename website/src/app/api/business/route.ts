import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Business from '@/models/Business';
import Product from '@/models/Product';
import Transaction from '@/models/Transaction';
import POSUser from '@/models/POSUser';
import CreditCustomer from '@/models/CreditCustomer';
import Category from '@/models/Category';
import { getSessionCookie, parseSession, isSessionExpired, clearSessionCookie } from '@/lib/auth';

export async function PUT(request: NextRequest) {
  try {
    await dbConnect();
    
    const sessionCookie = getSessionCookie();
    if (!sessionCookie) {
      clearSessionCookie();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const sessionData = parseSession(sessionCookie);
    if (!sessionData || isSessionExpired(sessionData)) {
      clearSessionCookie();
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }
    
    const business = await Business.findById(sessionData.businessId);
    if (!business) {
      clearSessionCookie();
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const body = await request.json();
    const updatedBusiness = await Business.findByIdAndUpdate(
      sessionData.businessId,
      {
        name: body.name,
        email: body.email,
        phone: body.phone,
        address: body.address,
        receiptFooter: body.receiptFooter,
        taxRate: body.taxRate,
        currency: body.currency,
      },
      { new: true }
    );

    return NextResponse.json({ 
      business: {
        id: updatedBusiness._id.toString(),
        name: updatedBusiness.name,
        email: updatedBusiness.email,
        phone: updatedBusiness.phone,
        address: updatedBusiness.address,
        receiptFooter: updatedBusiness.receiptFooter,
        taxRate: updatedBusiness.taxRate,
        currency: updatedBusiness.currency,
        apiKey: updatedBusiness.apiKey,
      } 
    }, { status: 200 });
  } catch (error) {
    console.error('Update business error:', error);
    return NextResponse.json({ error: 'Failed to update business' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const sessionCookie = getSessionCookie();
    if (!sessionCookie) {
      clearSessionCookie();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const sessionData = parseSession(sessionCookie);
    if (!sessionData || isSessionExpired(sessionData)) {
      clearSessionCookie();
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }
    
    const business = await Business.findById(sessionData.businessId);
    if (!business) {
      clearSessionCookie();
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Calculate dashboard stats
    const [products, transactions, users, creditCustomers, categories] = await Promise.all([
      Product.find({ businessId: business._id }),
      Transaction.find({ businessId: business._id }).sort({ createdAt: -1 }),
      POSUser.find({ businessId: business._id }),
      CreditCustomer.find({ businessId: business._id }),
      Category.find({ businessId: business._id })
    ]);

    // Calculate sales stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const todaySales = transactions.filter(t => new Date(t.createdAt) >= today).reduce((sum, t) => sum + (t.total || 0), 0);
    const weeklySales = transactions.filter(t => new Date(t.createdAt) >= weekAgo).reduce((sum, t) => sum + (t.total || 0), 0);
    const monthlySales = transactions.filter(t => new Date(t.createdAt) >= monthAgo).reduce((sum, t) => sum + (t.total || 0), 0);
    const stockValue = products.reduce((sum, p) => sum + (p.price * p.quantity || 0), 0);
    const lowStockItems = products.filter(p => p.quantity < (p.lowStockAlert || 10)).length;

    // Calculate top selling items
    const itemSales: Record<string, { item: string; sold: number; totalRevenue: number }> = {};
    transactions.forEach(tx => {
      if (tx.items) {
        tx.items.forEach((item: any) => {
          const key = item.name || item.sku || 'Unknown';
          if (!itemSales[key]) {
            itemSales[key] = { item: key, sold: 0, totalRevenue: 0 };
          }
          itemSales[key].sold += item.quantity || 0;
          itemSales[key].totalRevenue += item.total || (item.price * item.quantity) || 0;
        });
      }
    });
    const topSellingItems = Object.values(itemSales)
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5)
      .map((item, idx, arr) => ({
        ...item,
        percentage: arr.length > 0 ? Math.round((item.sold / arr[0].sold) * 100) : 0
      }));

    return NextResponse.json({
      business: {
        id: business._id.toString(),
        name: business.name,
        email: business.email,
        phone: business.phone,
        address: business.address,
        receiptFooter: business.receiptFooter,
        taxRate: business.taxRate,
        currency: business.currency,
        apiKey: business.apiKey,
        dataFolder: business.dataFolder,
      },
      stats: {
        todaySales,
        weeklySales,
        monthlySales,
        stockValue,
        lowStockItems,
      },
      products,
      transactions: transactions.slice(0, 10),
      users,
      creditCustomers,
      categories,
      topSellingItems,
    }, { status: 200 });
  } catch (error) {
    console.error('Get business data error:', error);
    return NextResponse.json({ error: 'Failed to fetch business data' }, { status: 500 });
  }
}
