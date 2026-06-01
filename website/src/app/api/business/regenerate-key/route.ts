import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Business from '@/models/Business';

function generateRandomHex(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function POST(request: NextRequest) {
  try {
    // For now, we'll get the first business (later we'll get it from session)
    await dbConnect();
    const business = await Business.findOne();
    
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Generate new API key
    const newApiKey = `whiz_${generateRandomHex(16)}`;
    business.apiKey = newApiKey;
    await business.save();

    return NextResponse.json({ 
      success: true, 
      apiKey: newApiKey 
    }, { status: 200 });
  } catch (error) {
    console.error('Regenerate API key error:', error);
    return NextResponse.json({ error: 'Failed to regenerate API key' }, { status: 500 });
  }
}
