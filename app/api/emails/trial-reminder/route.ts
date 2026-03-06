import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { to, shop, type } = await request.json();

    if (!to || !shop || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
    const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@profitpulse.io';

    if (!SENDGRID_API_KEY) {
      console.warn('SENDGRID_API_KEY not configured');
      return NextResponse.json({ success: false, message: 'Email service not configured' });
    }

    const shopName = shop.replace('.myshopify.com', '');
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const appUrl = `https://admin.shopify.com/store/${shopName}/apps/${clientId}`;

    const content = getEmailContent(type, shopName);

    const subjects: Record<string, string> = {
      expiring_soon: 'Your ProfitPulse trial is ending soon',
      expired: 'Your ProfitPulse trial has expired',
      pending: 'Complete your ProfitPulse subscription',
    };

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #0f172a; color: #ffffff; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 40px; }
    .logo { font-size: 32px; font-weight: 800; color: #22c55e; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 30px; margin: 20px 0; }
    .alert-badge { background: ${content.badgeColor}; color: #ffffff; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
    .button { display: inline-block; background: #22c55e; color: #ffffff; padding: 16px 40px; border-radius: 12px; text-decoration: none; font-weight: 600; }
    .footer { text-align: center; color: #64748b; font-size: 14px; margin-top: 40px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">ProfitPulse</div>
      <h1 style="color: #ffffff; margin: 20px 0;">${content.title}</h1>
    </div>
    <div class="alert-badge">
      <h2 style="margin: 0;">${content.badge}</h2>
      <p style="margin: 10px 0 0 0;">${content.badgeSubtext}</p>
    </div>
    <div class="card">
      <p style="color: #cbd5e1; line-height: 1.6;">${content.cardBody}</p>
      <div style="text-align: center; margin-top: 30px;">
        <a href="${appUrl}" class="button">${content.buttonText} →</a>
      </div>
    </div>
    <div class="footer">
      <p>© 2025 ProfitPulse</p>
    </div>
  </div>
</body>
</html>
    `;

    await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }], subject: subjects[type] }],
        from: { email: FROM_EMAIL, name: 'ProfitPulse' },
        content: [{ type: 'text/html', value: emailHtml }],
      }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getEmailContent(type: string, shopName: string) {
  const contents: Record<string, any> = {
    expiring_soon: {
      title: 'Your Trial is Ending Soon',
      badge: '⏰ 3 Days Left',
      badgeSubtext: 'Your ProfitPulse trial expires in 3 days',
      badgeColor: '#f59e0b',
      cardBody: `Your ProfitPulse trial for <strong>${shopName}</strong> is ending soon. Upgrade now to keep tracking your profits and COGS.`,
      buttonText: 'Upgrade to Pro',
    },
    expired: {
      title: 'Your Trial Has Expired',
      badge: '🔒 Trial Expired',
      badgeSubtext: 'Your ProfitPulse access has been paused',
      badgeColor: '#ef4444',
      cardBody: `Your trial for <strong>${shopName}</strong> has expired. Upgrade now to restore access to your profit analytics.`,
      buttonText: 'Upgrade Now',
    },
    pending: {
      title: 'Complete Your Subscription',
      badge: '⏳ Payment Pending',
      badgeSubtext: 'Your subscription is waiting for approval',
      badgeColor: '#3b82f6',
      cardBody: `Complete your subscription for <strong>${shopName}</strong> to continue using ProfitPulse Pro.`,
      buttonText: 'Complete Setup',
    },
  };
  return contents[type] || contents.expired;
}
