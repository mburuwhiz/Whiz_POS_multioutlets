import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Expense from '@/models/Expense';
import { getBusinessSessionCookie } from '@/lib/auth/session';
import Business from '@/models/Business';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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
    const expense = await Expense.findOneAndUpdate(
      { _id: params.id, businessId: business._id },
      {
        description: body.description,
        amount: body.amount,
        category: body.category,
        date: new Date(body.date),
        notes: body.notes,
      },
      { new: true }
    );

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    return NextResponse.json({ expense }, { status: 200 });
  } catch (error) {
    console.error('Update expense error:', error);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

    await Expense.findOneAndDelete({ _id: params.id, businessId: business._id });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Delete expense error:', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
