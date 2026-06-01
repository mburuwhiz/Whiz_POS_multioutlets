import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getAdminSessionCookie } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    const session = getAdminSessionCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const body = await request.json();
    const { to, subject, message } = body;

    if (!to || !subject || !message) {
      return NextResponse.json({ error: 'To, subject, and message are required' }, { status: 400 });
    }

    const brevoApiKey = process.env.BREVO_API_KEY;
    const emailFrom = process.env.EMAIL_FROM || 'info@pos.whizpoint.app';

    if (!brevoApiKey) {
      return NextResponse.json({ error: 'BREVO_API_KEY not configured' }, { status: 500 });
    }

    const brevoPayload = {
      sender: { name: "Whizpoint POS", email: emailFrom },
      to: [{ email: to }],
      subject,
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 20px; background: #f9fafb; border-radius: 0 0 8px 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Whizpoint POS</h1>
            </div>
            <div class="content">
              ${message.replace(/\n/g, '<br>')}
            </div>
          </div>
        </body>
        </html>
      `
    };

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
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Reply error:', error);
    return NextResponse.json({ error: 'Failed to send reply' }, { status: 500 });
  }
}
