import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Inquiry from '@/models/Inquiry';
import { getAdminSessionCookie } from '@/lib/auth/session';

export async function GET() {
  try {
    const session = getAdminSessionCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const inquiries = await Inquiry.find().sort({ createdAt: -1 });

    return NextResponse.json({ 
      inquiries: inquiries.map(i => ({
        id: i._id.toString(),
        name: i.name,
        email: i.email,
        company: i.company,
        message: i.message,
        createdAt: i.createdAt
      }))
    }, { status: 200 });
  } catch (error) {
    console.error('GET inquiries error:', error);
    return NextResponse.json({ error: 'Failed to fetch inquiries' }, { status: 500 });
  }
}
