import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import POSUser from '@/models/POSUser';
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
    const updateData: any = {
      name: body.name,
      username: body.username,
      email: body.email,
      role: body.role,
      isActive: body.isActive,
    };
    
    if (body.pin) {
      updateData.pin = body.pin;
    }

    const user = await POSUser.findOneAndUpdate(
      { _id: params.id, businessId: business._id },
      updateData,
      { returnDocument: 'after' }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
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

    await POSUser.findOneAndDelete({ _id: params.id, businessId: business._id });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
