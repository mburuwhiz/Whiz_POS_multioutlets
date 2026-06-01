import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CreditCustomer from '@/models/CreditCustomer';
import { getBusinessSessionCookie } from '@/lib/auth/session';
import Business from '@/models/Business';

export async function GET(request: NextRequest) {
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

    const customers = await CreditCustomer.find({ businessId: business._id });
    return NextResponse.json({ customers }, { status: 200 });
  } catch (error) {
    console.error('Get customers error:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const customer = await CreditCustomer.create({
      businessId: business._id,
      name: body.name,
      phone: body.phone || '',
      email: body.email || '',
      totalCredit: 0,
      paidAmount: 0,
      balance: 0,
      transactions: [],
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    console.error('Create customer error:', error);
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}
