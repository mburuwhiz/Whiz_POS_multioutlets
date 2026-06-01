import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export function getModernEmailTemplate(title: string, content: string, buttonText?: string, buttonUrl?: string) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.7;
      color: #1f2937;
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 25%, #fef3c7 50%, #fce7f3 75%, #f0f9ff 100%);
      background-size: 400% 400%;
      animation: gradientShift 15s ease infinite;
      padding: 60px 20px;
    }
    @keyframes gradientShift {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    .container {
      max-width: 620px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 32px;
      box-shadow: 
        0 32px 64px -12px rgba(0, 0, 0, 0.15),
        0 0 0 1px rgba(148, 163, 184, 0.1);
      overflow: hidden;
      position: relative;
    }
    .container::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 6px;
      background: linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899, #f59e0b, #3b82f6);
      background-size: 300% 100%;
      animation: stripePulse 4s linear infinite;
    }
    @keyframes stripePulse {
      0% { background-position: 0% 50%; }
      100% { background-position: 300% 50%; }
    }
    .header {
      background: linear-gradient(135deg, 
        #1e3a8a 0%, 
        #3730a3 30%, 
        #581c87 60%, 
        #831843 100%);
      padding: 56px 32px 48px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .header::before {
      content: '';
      position: absolute;
      top: -60%;
      left: -60%;
      width: 220%;
      height: 220%;
      background: radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 60%);
      animation: floatPulse 8s ease-in-out infinite;
    }
    .header::after {
      content: '';
      position: absolute;
      bottom: -30%;
      right: -30%;
      width: 150%;
      height: 150%;
      background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 60%);
      animation: floatPulse 12s ease-in-out infinite reverse;
    }
    @keyframes floatPulse {
      0%, 100% { transform: scale(1) rotate(0deg); }
      50% { transform: scale(1.15) rotate(5deg); }
    }
    .logo-wrapper {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
    }
    .logo-icon {
      width: 72px;
      height: 72px;
      background: linear-gradient(135deg, #ffffff 0%, #e0f2fe 100%);
      border-radius: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.3);
    }
    .logo-text {
      font-size: 42px;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: -2px;
      text-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
    .tagline {
      position: relative;
      color: #bfdbfe;
      font-size: 15px;
      font-weight: 600;
      letter-spacing: 4px;
      text-transform: uppercase;
      padding: 10px 24px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 100px;
      display: inline-block;
      backdrop-filter: blur(10px);
    }
    .content {
      padding: 48px 40px 40px;
    }
    .greeting {
      font-size: 28px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 20px;
      line-height: 1.2;
    }
    .text {
      color: #475569;
      font-size: 17px;
      line-height: 1.9;
      margin-bottom: 32px;
    }
    .credentials-card {
      background: linear-gradient(145deg, #f8fafc 0%, #ffffff 100%);
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 32px;
      margin-bottom: 32px;
      box-shadow: 
        0 10px 25px -5px rgba(15, 23, 42, 0.08),
        0 0 0 1px rgba(148, 163, 184, 0.15);
    }
    .credential-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 0;
      border-bottom: 1px solid #f1f5f9;
    }
    .credential-row:last-child {
      border-bottom: none;
    }
    .credential-label {
      font-size: 13px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 1.2px;
    }
    .credential-value {
      font-size: 17px;
      font-weight: 800;
      color: #1e293b;
      font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', monospace;
    }
    .credential-value.highlight {
      color: #3b82f6;
      font-size: 22px;
      letter-spacing: 2px;
      padding: 8px 16px;
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      border-radius: 10px;
    }
    .warning {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fcd34d 100%);
      border: 1px solid #f59e0b;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 32px;
      box-shadow: 0 8px 20px -5px rgba(245, 158, 11, 0.25);
    }
    .warning-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
    }
    .warning-icon {
      width: 24px;
      height: 24px;
      background: #f59e0b;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 900;
      font-size: 14px;
    }
    .warning-title {
      font-size: 14px;
      font-weight: 800;
      color: #92400e;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .warning-text {
      color: #78350f;
      font-size: 16px;
      line-height: 1.8;
      font-weight: 500;
    }
    .button-container {
      text-align: center;
      margin: 40px 0;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 50%, #1e40af 100%);
      color: #ffffff;
      padding: 18px 48px;
      text-decoration: none;
      border-radius: 16px;
      font-weight: 700;
      font-size: 17px;
      letter-spacing: 0.5px;
      box-shadow: 
        0 20px 40px -12px rgba(59, 130, 246, 0.5),
        0 0 0 1px rgba(37, 99, 235, 0.3);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }
    .button::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
      transition: left 0.6s ease;
    }
    .button:hover::before {
      left: 100%;
    }
    .button:hover {
      transform: translateY(-4px) scale(1.02);
      box-shadow: 
        0 30px 60px -15px rgba(59, 130, 246, 0.6),
        0 0 0 1px rgba(37, 99, 235, 0.4);
    }
    .divider {
      height: 2px;
      background: linear-gradient(90deg, transparent, #e2e8f0 20%, #e2e8f0 80%, transparent);
      margin: 40px 0;
    }
    .footer {
      text-align: center;
      padding: 0 40px 48px;
      color: #64748b;
      font-size: 15px;
    }
    .footer-signature {
      font-size: 16px;
      margin-bottom: 20px;
    }
    .footer-team {
      font-weight: 800;
      color: #1e293b;
    }
    .footer-help {
      font-size: 14px;
    }
    .footer-link {
      color: #3b82f6;
      text-decoration: none;
      font-weight: 700;
      transition: color 0.2s ease;
    }
    .footer-link:hover {
      color: #1d4ed8;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-wrapper">
        <div class="logo-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="10" rx="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <div class="logo-text">Whizpoint</div>
      </div>
      <div class="tagline">${title}</div>
    </div>
    <div class="content">
      ${content}
    </div>
    ${buttonText && buttonUrl ? `
    <div class="button-container">
      <a href="${buttonUrl}" class="button">${buttonText}</a>
    </div>
    ` : ''}
    <div class="divider"></div>
    <div class="footer">
      <p class="footer-signature">Best regards,<br><span class="footer-team">The Whizpoint Team</span></p>
      <p class="footer-help">
        Need help? Contact us at <a href="mailto:info@pos.whizpoint.app" class="footer-link">info@pos.whizpoint.app</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

export async function sendPasswordResetEmail(to: string, username: string, newPassword: string) {
  const content = `
    <div class="greeting">Hello ${username},</div>
    <div class="text">
      Your password has been reset. Here are your new login credentials:
    </div>
    <div class="credentials-card">
      <div class="credential-row">
        <span class="credential-label">Username</span>
        <span class="credential-value">${username}</span>
      </div>
      <div class="credential-row">
        <span class="credential-label">Temporary Password</span>
        <span class="credential-value highlight">${newPassword}</span>
      </div>
    </div>
    <div class="warning">
      <div class="warning-title">Important</div>
      <div class="warning-text">Please log in and change your password immediately.</div>
    </div>
  `;

  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@whizpoint.com',
    to,
    subject: 'Your Password Has Been Reset',
    html: getModernEmailTemplate('Password Reset', content),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${to}`);
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

export async function sendBusinessPasswordResetEmail(to: string, businessName: string, emailPrefix: string, newPassword: string) {
  const content = `
    <div class="greeting">Hey ${businessName},</div>
    <div class="text">
      Your Whizpoint POS password has been successfully reset! 🎉 Here are your new login credentials:
    </div>
    <div class="credentials-card">
      <div class="credential-row">
        <span class="credential-label">Business</span>
        <span class="credential-value">${businessName}</span>
      </div>
      <div class="credential-row">
        <span class="credential-label">Username</span>
        <span class="credential-value">${emailPrefix}</span>
      </div>
      <div class="credential-row">
        <span class="credential-label">Username</span>
        <span class="credential-value">${emailPrefix}@pos.whizpoint.app</span>
      </div>
      <div class="credential-row">
        <span class="credential-label">Temporary Password</span>
        <span class="credential-value highlight">${newPassword}</span>
      </div>
    </div>
    <div class="warning">
      <div class="warning-header">
        <div class="warning-icon">!</div>
        <div class="warning-title">Important Note</div>
      </div>
      <div class="warning-text">
        You must change your password immediately after logging in! This temporary password will only work for your first login.
      </div>
    </div>
  `;

  const brevoApiKey = process.env.BREVO_API_KEY;
  const emailFrom = process.env.EMAIL_FROM || 'info@pos.whizpoint.app';

  if (brevoApiKey) {
    const brevoPayload = {
      sender: { name: "Whizpoint POS", email: emailFrom },
      to: [{ email: to, name: businessName }],
      subject: 'Your Whizpoint POS Password Has Been Reset',
      htmlContent: getModernEmailTemplate('Password Reset', content, 'Login to Whizpoint POS', 'https://pos.whizpoint.app/auth/login'),
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
      console.error('Failed to send password reset email:', brevoError);
    }
  }

  try {
    await transporter.sendMail({
      from: emailFrom,
      to,
      subject: 'Your Whizpoint POS Password Has Been Reset',
      html: getModernEmailTemplate('Password Reset', content, 'Login to Whizpoint POS', 'https://pos.whizpoint.app/auth/login'),
    });
    console.log(`Business password reset email sent to ${to}`);
  } catch (error) {
    console.error('Failed to send email via nodemailer:', error);
  }
}
