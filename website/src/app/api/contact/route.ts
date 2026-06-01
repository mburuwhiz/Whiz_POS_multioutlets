import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Inquiry from '@/models/Inquiry';

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { name, email, company, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required.' },
        { status: 400 }
      );
    }

    const newInquiry = new Inquiry({ name, email, company, message });
    await newInquiry.save();

    const escapeHTML = (str: string) => str.replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );

    const safeName = escapeHTML(name);
    const safeEmail = escapeHTML(email);
    const safeCompany = escapeHTML(company || '');
    const safeMessage = escapeHTML(message);
    const emailFrom = process.env.EMAIL_FROM || 'info@pos.whizpoint.app';
    const emailTo = 'sales@pos.whizpoint.app';

    const brevoApiKey = process.env.BREVO_API_KEY;

    if (!brevoApiKey) {
      console.warn("BREVO_API_KEY not provided. Simulating successful email send.");
      return NextResponse.json({ message: 'Inquiry saved successfully' }, { status: 200 });
    }

    const brevoPayload = {
      sender: {
        name: "Website Contact Form",
        email: emailFrom
      },
      to: [
        {
          email: emailTo,
          name: "Sales Team"
        }
      ],
      replyTo: {
        email: safeEmail,
        name: safeName
      },
      subject: `New Lead: ${safeName} from ${safeCompany || 'Unknown Company'}`,
      htmlContent: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Company:</strong> ${safeCompany || 'Not provided'}</p>
        <br/>
        <h3>Message:</h3>
        <p>${safeMessage.replace(/\n/g, '<br>')}</p>
      `,
      textContent: `
Name: ${safeName}
Email: ${safeEmail}
Company: ${safeCompany || 'Not provided'}

Message:
${safeMessage}
      `
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
      console.error('Failed to send Brevo email:', brevoError);
    }

    return NextResponse.json(
      { message: 'Inquiry saved successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error handling inquiry:', error);
    return NextResponse.json(
      { error: 'Failed to process inquiry' },
      { status: 500 }
    );
  }
}
