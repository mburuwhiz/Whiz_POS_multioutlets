import { NextResponse } from 'next/server';
import { setSessionCookie, createSession } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Business from '@/models/Business';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    await dbConnect();
    const { email, password } = await request.json();

    const business = await Business.findOne({
      $or: [{ emailPrefix: email }, { email }]
    });

    if (!business) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (business.mustChangePassword) {
      if (business.oneTimePassword === password) {
        const token = createSession({
          businessId: business._id.toString(),
          email: business.email,
          role: 'business',
          mustChangePassword: true
        });
        setSessionCookie(token);
        return NextResponse.json({
          success: true,
          mustChangePassword: true,
          business: { id: business._id, name: business.name, email: business.email }
        });
      } else {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
    }

    let validPassword = false;
    if (business.password) {
      validPassword = await bcrypt.compare(password, business.password);
    } else if (business.oneTimePassword === password) {
      validPassword = true;
    }

    if (!validPassword) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = createSession({
      businessId: business._id.toString(),
      email: business.email,
      role: 'business',
      mustChangePassword: false
    });
    setSessionCookie(token);
    return NextResponse.json({
      success: true,
      business: { id: business._id, name: business.name, email: business.email }
    });
  } catch (e) {
    console.error('Login error:', e);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
