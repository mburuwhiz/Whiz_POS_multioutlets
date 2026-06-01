import { NextResponse } from 'next/server';
import { getSessionCookie, setSessionCookie, createSession, parseSession, clearSessionCookie, isSessionExpired } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Business from '@/models/Business';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    await dbConnect();
    
    const token = getSessionCookie();
    if (!token) {
      clearSessionCookie();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = parseSession(token);
    if (!session || isSessionExpired(session)) {
      clearSessionCookie();
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const { password } = await request.json();
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const business = await Business.findById(session.businessId);
    if (!business) {
      clearSessionCookie();
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    
    await Business.findByIdAndUpdate(session.businessId, {
      password: hashedPassword,
      mustChangePassword: false,
      oneTimePassword: null
    });

    const newToken = createSession({
      businessId: session.businessId,
      email: session.email,
      role: session.role,
      mustChangePassword: false
    });
    setSessionCookie(newToken);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Change password error:', e);
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 });
  }
}
