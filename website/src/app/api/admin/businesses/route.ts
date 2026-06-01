import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Business from '@/models/Business';
import { getAdminSessionCookie } from '@/lib/auth/session';
import { getModernEmailTemplate } from '@/lib/email';

function generateRandomHex(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function generateOneTimePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function GET() {
  try {
    const session = getAdminSessionCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const businesses = await Business.find().sort({ createdAt: -1 });
    
    return NextResponse.json({ 
      businesses: businesses.map(b => ({
        id: b._id.toString(),
        name: b.name,
        emailPrefix: b.emailPrefix,
        email: b.email,
        status: b.status,
        apiKey: b.apiKey,
        createdAt: b.createdAt,
        dataFolder: b.dataFolder,
        mustChangePassword: b.mustChangePassword
      }))
    }, { status: 200 });
  } catch (error) {
    console.error('GET businesses error:', error);
    return NextResponse.json({ error: 'Failed to fetch businesses' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = getAdminSessionCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const body = await request.json();
    const { name, emailPrefix, email } = body;

    if (!name || !emailPrefix || !email) {
      return NextResponse.json({ error: 'Name, email prefix, and email are required' }, { status: 400 });
    }

    const apiKey = `whiz_${generateRandomHex(16)}`;
    const dataFolder = `business_${generateRandomHex(8)}`;
    const oneTimePassword = generateOneTimePassword();

    const newBusiness = new Business({
      name,
      emailPrefix,
      email,
      apiKey,
      dataFolder,
      oneTimePassword,
      mustChangePassword: true
    });

    await newBusiness.save();

    // Send welcome email via Brevo
    const brevoApiKey = process.env.BREVO_API_KEY;
    const emailFrom = process.env.EMAIL_FROM || 'info@pos.whizpoint.app';

    if (brevoApiKey) {
      const content = `
        <div class="greeting">Hi ${name},</div>
        <div class="text">
          Your Whizpoint POS account has been successfully created! Below are your login details:
        </div>
        <div class="credentials-card">
          <div class="credential-row">
            <span class="credential-label">Business Name</span>
            <span class="credential-value">${name}</span>
          </div>
          <div class="credential-row">
            <span class="credential-label">Username 1</span>
            <span class="credential-value">${emailPrefix}</span>
          </div>
          <div class="credential-row">
            <span class="credential-label">Username 2</span>
            <span class="credential-value">${emailPrefix}@pos.whizpoint.app</span>
          </div>
          <div class="credential-row">
            <span class="credential-label">One-Time Password</span>
            <span class="credential-value highlight">${oneTimePassword}</span>
          </div>
        </div>
        <div class="warning">
          <div class="warning-title">Important</div>
          <div class="warning-text">You must change your password immediately after your first login!</div>
        </div>
      `;

      const brevoPayload = {
        sender: { name: "Whizpoint POS", email: emailFrom },
        to: [{ email, name }],
        subject: `Welcome to Whizpoint POS - Your Account Details`,
        htmlContent: getModernEmailTemplate('Welcome Aboard!', content, 'Login to Whizpoint POS', 'https://pos.whizpoint.app/auth/login'),
      };

      try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': brevoApiKey
          },
          body: JSON.stringify(brevoPayload)
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Brevo API error:', errorData);
        }
      } catch (brevoError) {
        console.error('Failed to send welcome email:', brevoError);
      }
    }

    return NextResponse.json({ 
      business: { 
        id: newBusiness._id.toString(),
        name: newBusiness.name,
        emailPrefix: newBusiness.emailPrefix,
        email: newBusiness.email,
        status: newBusiness.status,
        apiKey: newBusiness.apiKey,
        createdAt: newBusiness.createdAt,
        dataFolder: newBusiness.dataFolder,
        oneTimePassword,
        mustChangePassword: newBusiness.mustChangePassword
      } 
    }, { status: 201 });
  } catch (error) {
    console.error('POST business error:', error);
    return NextResponse.json({ error: 'Failed to create business' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = getAdminSessionCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const body = await request.json();
    const { id, name, emailPrefix, email, status } = body;

    const business = await Business.findById(id);
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    if (name) business.name = name;
    if (emailPrefix) business.emailPrefix = emailPrefix;
    if (email) business.email = email;
    if (status) business.status = status;

    await business.save();

    return NextResponse.json({ 
      business: { 
        id: business._id.toString(),
        name: business.name,
        emailPrefix: business.emailPrefix,
        email: business.email,
        status: business.status,
        apiKey: business.apiKey,
        createdAt: business.createdAt,
        dataFolder: business.dataFolder,
        mustChangePassword: business.mustChangePassword
      } 
    }, { status: 200 });
  } catch (error) {
    console.error('PUT business error:', error);
    return NextResponse.json({ error: 'Failed to update business' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = getAdminSessionCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const body = await request.json();
    const { id } = body;

    const business = await Business.findByIdAndDelete(id);
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Business deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('DELETE business error:', error);
    return NextResponse.json({ error: 'Failed to delete business' }, { status: 500 });
  }
}
