import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getAdminSessionCookie } from '@/lib/auth/session';
import Business from '@/models/Business';
import crypto from 'crypto';
import { sendBusinessPasswordResetEmail } from '@/lib/email';

function generateOneTimePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    
    const session = getAdminSessionCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const business = await Business.findById(params.id);
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const newPassword = generateOneTimePassword();
    
    business.oneTimePassword = newPassword;
    business.mustChangePassword = true;
    await business.save();

    if (business.email) {
      try {
        await sendBusinessPasswordResetEmail(business.email, business.name, business.emailPrefix, newPassword);
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
