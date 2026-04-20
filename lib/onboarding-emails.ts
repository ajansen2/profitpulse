/**
 * Onboarding Email Sequence
 *
 * Triggered by cron, sends timed emails based on when the merchant installed.
 * Sequence:
 *   Day 0 (immediate): Welcome to ProfitPulse
 *   Day 1: Add your product costs (COGS)
 *   Day 3: Set a profit goal
 *   Day 5: Try AI forecasting
 *   Day 6: Trial ending tomorrow — upgrade to Pro
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'ProfitPulse <hello@send.argora.ai>';

function dashboardUrl(shopDomain: string): string {
  const shopName = shopDomain.replace('.myshopify.com', '');
  return `https://admin.shopify.com/store/${shopName}/apps/profitpulse`;
}

function settingsUrl(shopDomain: string): string {
  const shopName = shopDomain.replace('.myshopify.com', '');
  return `https://admin.shopify.com/store/${shopName}/apps/profitpulse/settings`;
}

function wrapEmail(body: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-size:28px;font-weight:bold;background:linear-gradient(to right,#10b981,#06b6d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">ProfitPulse</div>
    </div>
    <div style="background:#141414;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:32px;">
      ${body}
    </div>
    <div style="text-align:center;margin-top:24px;color:rgba(255,255,255,0.3);font-size:12px;">
      <p>ProfitPulse — Profit Analytics for Shopify</p>
      <p>You're receiving this because you installed ProfitPulse. <a href="https://www.argora.ai" style="color:rgba(255,255,255,0.4);">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`;
}

function ctaButton(text: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;padding:14px 32px;background:linear-gradient(to right,#10b981,#06b6d4);color:white;font-weight:bold;font-size:16px;text-decoration:none;border-radius:12px;margin-top:8px;">${text}</a>`;
}

// ─── Email Templates ────────────────────────────────────────

export function welcomeEmail(storeName: string, shopDomain: string): { subject: string; html: string } {
  return {
    subject: `Welcome to ProfitPulse, ${storeName}!`,
    html: wrapEmail(`
      <h1 style="color:white;font-size:28px;margin:0 0 8px;">Welcome to ProfitPulse!</h1>
      <p style="color:rgba(255,255,255,0.6);font-size:16px;margin:0 0 24px;">Your 7-day Pro trial has started. Here's how to get the most out of it.</p>

      <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:20px;margin-bottom:24px;">
        <h3 style="color:#10b981;font-size:14px;margin:0 0 12px;text-transform:uppercase;letter-spacing:1px;">Quick Start Checklist</h3>
        <div style="color:white;font-size:15px;line-height:2;">
          1. Your Shopify data is already syncing<br>
          2. Add COGS to your top products<br>
          3. Set your first profit goal<br>
          4. Check your real-time profit dashboard
        </div>
      </div>

      <p style="color:rgba(255,255,255,0.6);font-size:14px;">Your dashboard is live with your Shopify data syncing in real-time.</p>

      <div style="text-align:center;margin-top:24px;">
        ${ctaButton('Open Your Dashboard', dashboardUrl(shopDomain))}
      </div>
    `),
  };
}

export function addProductCostsEmail(storeName: string, shopDomain: string): { subject: string; html: string } {
  return {
    subject: `${storeName} — add product costs to see true profit`,
    html: wrapEmail(`
      <h1 style="color:white;font-size:24px;margin:0 0 8px;">Add Your Product Costs</h1>
      <p style="color:rgba(255,255,255,0.6);font-size:16px;margin:0 0 24px;">ProfitPulse can't calculate true profit without COGS. Add costs to your top 10 products — takes 5 minutes.</p>

      <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);border-radius:12px;padding:20px;margin-bottom:24px;">
        <h3 style="color:#10b981;font-size:14px;margin:0 0 12px;">Why this matters:</h3>
        <div style="color:rgba(255,255,255,0.8);font-size:15px;line-height:2;">
          Revenue alone is vanity — profit is sanity.<br>
          Without COGS, your dashboard shows revenue, not real margins.<br>
          Add costs once, ProfitPulse calculates profit on every order automatically.
        </div>
      </div>

      <p style="color:rgba(255,255,255,0.5);font-size:14px;">Start with your top sellers. You can always add more later.</p>

      <div style="text-align:center;margin-top:24px;">
        ${ctaButton('Add Product Costs', settingsUrl(shopDomain))}
      </div>
    `),
  };
}

export function setProfitGoalEmail(storeName: string, shopDomain: string): { subject: string; html: string } {
  return {
    subject: `Set a profit goal — track daily/weekly/monthly targets`,
    html: wrapEmail(`
      <h1 style="color:white;font-size:24px;margin:0 0 8px;">Set a Profit Goal</h1>
      <p style="color:rgba(255,255,255,0.6);font-size:16px;margin:0 0 24px;">Track daily, weekly, or monthly profit targets. Get alerts when you're ahead or behind.</p>

      <div style="background:rgba(6,182,212,0.1);border:1px solid rgba(6,182,212,0.2);border-radius:12px;padding:20px;margin-bottom:24px;">
        <h3 style="color:#06b6d4;font-size:14px;margin:0 0 12px;">How profit goals work:</h3>
        <div style="color:rgba(255,255,255,0.8);font-size:15px;line-height:2;">
          &#10003; Set daily, weekly, or monthly profit targets<br>
          &#10003; See progress bars on your dashboard<br>
          &#10003; Get notified when you hit or miss targets<br>
          &#10003; Adjust goals as your business grows
        </div>
      </div>

      <p style="color:rgba(255,255,255,0.5);font-size:14px;">Stores with profit goals check ProfitPulse 3x more often.</p>

      <div style="text-align:center;margin-top:24px;">
        ${ctaButton('Set Profit Goal', dashboardUrl(shopDomain))}
      </div>
    `),
  };
}

export function tryForecastingEmail(storeName: string, shopDomain: string): { subject: string; html: string } {
  return {
    subject: `Your 30-day profit forecast is ready`,
    html: wrapEmail(`
      <h1 style="color:white;font-size:24px;margin:0 0 8px;">Try AI Forecasting</h1>
      <p style="color:rgba(255,255,255,0.6);font-size:16px;margin:0 0 24px;">ProfitPulse predicts your revenue and profit for the next 30 days based on your trends.</p>

      <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);border-radius:12px;padding:20px;margin-bottom:24px;">
        <h3 style="color:#10b981;font-size:14px;margin:0 0 12px;">What AI Forecasting shows you:</h3>
        <div style="color:rgba(255,255,255,0.8);font-size:15px;line-height:2;">
          Projected revenue for the next 30 days<br>
          Estimated profit based on your COGS<br>
          Trend analysis — are you growing or declining?<br>
          Seasonal patterns in your sales data
        </div>
      </div>

      <p style="color:rgba(255,255,255,0.5);font-size:14px;">The more data ProfitPulse has, the more accurate your forecast becomes.</p>

      <div style="text-align:center;margin-top:24px;">
        ${ctaButton('View Forecast', dashboardUrl(shopDomain))}
      </div>
    `),
  };
}

export function trialEndingEmail(storeName: string, shopDomain: string): { subject: string; html: string } {
  return {
    subject: `Your ProfitPulse Pro trial ends tomorrow`,
    html: wrapEmail(`
      <h1 style="color:white;font-size:24px;margin:0 0 8px;">Your Trial Ends Tomorrow</h1>
      <p style="color:rgba(255,255,255,0.6);font-size:16px;margin:0 0 24px;">Your 7-day Pro trial is almost over. Subscribe to keep all your Pro features.</p>

      <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:20px;margin-bottom:24px;">
        <h3 style="color:#ef4444;font-size:14px;margin:0 0 12px;">What you'll lose without Pro:</h3>
        <div style="color:rgba(255,255,255,0.7);font-size:15px;line-height:2;">
          &#10007; AI Forecasting<br>
          &#10007; Unlimited products<br>
          &#10007; Profit goals & alerts<br>
          &#10007; Advanced analytics
        </div>
      </div>

      <div style="background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.2);border-radius:12px;padding:20px;margin-bottom:24px;">
        <h3 style="color:#22c55e;font-size:14px;margin:0 0 12px;">What you keep on Free:</h3>
        <div style="color:rgba(255,255,255,0.7);font-size:15px;line-height:1.8;">
          &#10003; Basic profit dashboard<br>
          &#10003; 50 orders/month
        </div>
      </div>

      <div style="text-align:center;margin-top:24px;">
        ${ctaButton('Upgrade to Pro — $29.99/mo', dashboardUrl(shopDomain))}
        <p style="color:rgba(255,255,255,0.4);font-size:12px;margin-top:12px;">Cancel anytime. Billed through Shopify.</p>
      </div>
    `),
  };
}

// ─── Send function ──────────────────────────────────────────

export async function sendOnboardingEmail(
  to: string,
  email: { subject: string; html: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject: email.subject,
      html: email.html,
    });

    if (error) {
      console.error('Onboarding email error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Onboarding email failed:', err);
    return { success: false, error: err?.message || 'Unknown error' };
  }
}
