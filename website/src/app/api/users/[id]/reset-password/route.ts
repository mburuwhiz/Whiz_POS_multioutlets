import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import POSUser from '@/models/POSUser';
import { getBusinessSessionCookie } from '@/lib/auth/session';
import Business from '@/models/Business';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '@/lib/email';

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

    const user = await POSUser.findOne({ _id: params.id, businessId: business._id });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const newPassword = crypto.randomBytes(6).toString('hex');
    
    user.pin = newPassword;
    user.passwordChangeRequired = true;
    await user.save();

    if (user.email) {
      try {
        await sendPasswordResetEmail(user.email, user.username, newPassword);
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Password reset successfully',
      tempPassword: newPassword
    }, { status: 200 });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
