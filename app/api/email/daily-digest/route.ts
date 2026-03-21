import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    // Get all stores with daily digest enabled
    const { data: stores } = await supabase
      .from('stores')
      .select('*, store_settings(*)')
      .eq('subscription_status', 'active');

    if (!stores || stores.length === 0) {
      return NextResponse.json({ message: 'No active stores' });
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const results = [];

    for (const store of stores) {
      // Skip if daily digest is disabled
      if (store.store_settings?.email_daily_digest === false) continue;
      if (!store.email) continue;

      // Get yesterday's orders
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('store_id', store.id)
        .gte('order_created_at', yesterday.toISOString())
        .lt('order_created_at', today.toISOString());

      if (!orders || orders.length === 0) {
        // Still send email even with no orders
        await sendDigestEmail(store, {
          orderCount: 0,
          revenue: 0,
          profit: 0,
          margin: 0,
          bestProduct: null,
          worstProduct: null,
        });
        results.push({ store: store.shop_domain, status: 'sent', orders: 0 });
        continue;
      }

      // Calculate metrics
      const totalRevenue = orders.reduce((sum, o) => sum + (o.total_price || 0), 0);
      const totalProfit = orders.reduce((sum, o) => sum + (o.net_profit || 0), 0);
      const avgMargin = orders.length > 0
        ? orders.reduce((sum, o) => sum + (o.profit_margin || 0), 0) / orders.length
        : 0;

      // Get line items for best/worst products
      const orderIds = orders.map(o => o.id);
      const { data: lineItems } = await supabase
        .from('order_line_items')
        .select('*')
        .in('order_id', orderIds);

      // Aggregate by product
      const productProfits: { [key: string]: { title: string; profit: number; quantity: number } } = {};
      lineItems?.forEach(item => {
        const key = item.title;
        if (!productProfits[key]) {
          productProfits[key] = { title: item.title, profit: 0, quantity: 0 };
        }
        productProfits[key].profit += item.profit || 0;
        productProfits[key].quantity += item.quantity || 0;
      });

      const sortedProducts = Object.values(productProfits).sort((a, b) => b.profit - a.profit);
      const bestProduct = sortedProducts[0] || null;
      const worstProduct = sortedProducts[sortedProducts.length - 1] || null;

      await sendDigestEmail(store, {
        orderCount: orders.length,
        revenue: totalRevenue,
        profit: totalProfit,
        margin: avgMargin,
        bestProduct,
        worstProduct: worstProduct?.profit < 0 ? worstProduct : null,
      });

      results.push({
        store: store.shop_domain,
        status: 'sent',
        orders: orders.length,
        revenue: totalRevenue,
        profit: totalProfit
      });
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Daily digest error:', error);
    return NextResponse.json({ error: 'Failed to send digests' }, { status: 500 });
  }
}

async function sendDigestEmail(
  store: any,
  data: {
    orderCount: number;
    revenue: number;
    profit: number;
    margin: number;
    bestProduct: { title: string; profit: number; quantity: number } | null;
    worstProduct: { title: string; profit: number; quantity: number } | null;
  }
) {
  const formatCurrency = (v: number) => `$${v.toFixed(2)}`;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const profitColor = data.profit >= 0 ? '#10b981' : '#ef4444';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1e293b 0%, #064e3b 100%); border-radius: 16px; overflow: hidden;">
        <!-- Header -->
        <div style="padding: 30px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1);">
          <h1 style="color: #10b981; margin: 0; font-size: 28px;">ProfitPulse</h1>
          <p style="color: rgba(255,255,255,0.6); margin: 10px 0 0;">Daily Profit Digest</p>
        </div>

        <!-- Store & Date -->
        <div style="padding: 20px 30px; background: rgba(255,255,255,0.05);">
          <p style="color: white; margin: 0; font-size: 18px;">${store.store_name || store.shop_domain}</p>
          <p style="color: rgba(255,255,255,0.5); margin: 5px 0 0; font-size: 14px;">${dateStr}</p>
        </div>

        <!-- Main Stats -->
        <div style="padding: 30px;">
          ${data.orderCount === 0 ? `
            <div style="text-align: center; padding: 40px 0;">
              <p style="color: rgba(255,255,255,0.6); font-size: 18px; margin: 0;">No orders yesterday</p>
              <p style="color: rgba(255,255,255,0.4); font-size: 14px; margin: 10px 0 0;">Check back tomorrow!</p>
            </div>
          ` : `
            <!-- Stats Grid -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px;">
              <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; text-align: center;">
                <p style="color: rgba(255,255,255,0.5); margin: 0 0 5px; font-size: 12px; text-transform: uppercase;">Revenue</p>
                <p style="color: white; margin: 0; font-size: 24px; font-weight: bold;">${formatCurrency(data.revenue)}</p>
              </div>
              <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; text-align: center;">
                <p style="color: rgba(255,255,255,0.5); margin: 0 0 5px; font-size: 12px; text-transform: uppercase;">Net Profit</p>
                <p style="color: ${profitColor}; margin: 0; font-size: 24px; font-weight: bold;">${formatCurrency(data.profit)}</p>
              </div>
              <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; text-align: center;">
                <p style="color: rgba(255,255,255,0.5); margin: 0 0 5px; font-size: 12px; text-transform: uppercase;">Orders</p>
                <p style="color: white; margin: 0; font-size: 24px; font-weight: bold;">${data.orderCount}</p>
              </div>
              <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; text-align: center;">
                <p style="color: rgba(255,255,255,0.5); margin: 0 0 5px; font-size: 12px; text-transform: uppercase;">Avg Margin</p>
                <p style="color: white; margin: 0; font-size: 24px; font-weight: bold;">${data.margin.toFixed(1)}%</p>
              </div>
            </div>

            ${data.bestProduct ? `
              <!-- Best Seller -->
              <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 15px; margin-bottom: 15px;">
                <p style="color: #10b981; margin: 0 0 5px; font-size: 12px; text-transform: uppercase;">Top Performer</p>
                <p style="color: white; margin: 0; font-weight: 500;">${data.bestProduct.title}</p>
                <p style="color: #10b981; margin: 5px 0 0; font-size: 14px;">${formatCurrency(data.bestProduct.profit)} profit from ${data.bestProduct.quantity} sold</p>
              </div>
            ` : ''}

            ${data.worstProduct ? `
              <!-- Problem Product -->
              <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 15px;">
                <p style="color: #ef4444; margin: 0 0 5px; font-size: 12px; text-transform: uppercase;">Needs Attention</p>
                <p style="color: white; margin: 0; font-weight: 500;">${data.worstProduct.title}</p>
                <p style="color: #ef4444; margin: 5px 0 0; font-size: 14px;">${formatCurrency(data.worstProduct.profit)} loss from ${data.worstProduct.quantity} sold</p>
              </div>
            ` : ''}
          `}
        </div>

        <!-- CTA -->
        <div style="padding: 20px 30px 30px; text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard?shop=${store.shop_domain}"
             style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-weight: 600;">
            View Full Dashboard
          </a>
        </div>

        <!-- Footer -->
        <div style="padding: 20px 30px; background: rgba(0,0,0,0.2); text-align: center;">
          <p style="color: rgba(255,255,255,0.4); margin: 0; font-size: 12px;">
            You're receiving this because you enabled daily digests in ProfitPulse settings.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  await resend.emails.send({
    from: 'ProfitPulse <digest@profitpulse.app>',
    to: store.email,
    subject: data.orderCount > 0
      ? `${dateStr}: ${formatCurrency(data.profit)} profit from ${data.orderCount} orders`
      : `${dateStr}: No orders yesterday`,
    html,
  });
}

// For Vercel Cron (runs daily at 8am UTC)
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Trigger the digest
  return POST(request);
}
