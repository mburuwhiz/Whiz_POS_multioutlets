import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CreditCustomer from '@/models/CreditCustomer';
import { getBusinessSessionCookie } from '@/lib/auth/session';
import Business from '@/models/Business';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    
    const sessionCookie = getBusinessSessionCookie();
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    let sessionData;
    try {
      sessionData = JSON.parse(Buffer.from(sessionCookie, 'base64').toString());
    } catch (e) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    
    const business = await Business.findById(sessionData.businessId);
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const { amount } = await request.json();
    const customer = await CreditCustomer.findOne({ _id: params.id, businessId: business._id });
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const newPaidAmount = (customer.paidAmount || 0) + amount;
    const newBalance = (customer.balance || 0) - amount;

    const updatedCustomer = await CreditCustomer.findOneAndUpdate(
      { _id: params.id, businessId: business._id },
      {
        paidAmount: newPaidAmount,
        balance: newBalance,
      },
      { new: true }
    );

    return NextResponse.json({ customer: updatedCustomer }, { status: 200 });
  } catch (error) {
    console.error('Record payment error:', error);
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
  }
}
