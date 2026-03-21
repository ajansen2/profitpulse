import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { getDailyDigestEmail, DailyDigestData } from '@/lib/email-templates';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Daily Digest Cron Job
 * Sends profit summary email to all stores with daily digest enabled
 * Schedule: Every day at 8am EST
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get all stores with daily digest enabled
  const { data: stores } = await supabase
    .from('stores')
    .select('id, store_name, email')
    .eq('subscription_status', 'active');

  if (!stores || stores.length === 0) {
    return NextResponse.json({ message: 'No active stores found' });
  }

  let sent = 0;
  let errors = 0;

  for (const store of stores) {
    try {
      // Check if store has daily digest enabled
      const { data: settings } = await supabase
        .from('store_settings')
        .select('email_daily_digest')
        .eq('store_id', store.id)
        .single();

      if (!settings?.email_daily_digest) continue;

      // Get yesterday's data
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const startOfYesterday = new Date(yesterday);
      startOfYesterday.setHours(0, 0, 0, 0);
      const endOfYesterday = new Date(yesterday);
      endOfYesterday.setHours(23, 59, 59, 999);

      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('store_id', store.id)
        .gte('order_created_at', startOfYesterday.toISOString())
        .lte('order_created_at', endOfYesterday.toISOString());

      const totalRevenue = orders?.reduce((sum, o) => sum + (o.total_price || 0), 0) || 0;
      const totalProfit = orders?.reduce((sum, o) => sum + (o.net_profit || 0), 0) || 0;
      const totalOrders = orders?.length || 0;
      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      // Get top products from line items
      const orderIds = orders?.map(o => o.shopify_order_id) || [];
      let topProducts: { title: string; profit: number }[] = [];

      if (orderIds.length > 0) {
        const { data: lineItems } = await supabase
          .from('order_line_items')
          .select('title, shopify_product_id, profit')
          .eq('store_id', store.id)
          .in('order_id', orderIds);

        const productProfits: Record<string, { title: string; profit: number }> = {};
        for (const item of lineItems || []) {
          const key = item.shopify_product_id || item.title;
          if (!productProfits[key]) {
            productProfits[key] = { title: item.title, profit: 0 };
          }
          productProfits[key].profit += item.profit || 0;
        }
        topProducts = Object.values(productProfits)
          .sort((a, b) => b.profit - a.profit)
          .slice(0, 5);
      }

      // Get comparison data (day before yesterday)
      const dayBefore = new Date(startOfYesterday);
      dayBefore.setDate(dayBefore.getDate() - 1);
      const dayBeforeEnd = new Date(dayBefore);
      dayBeforeEnd.setHours(23, 59, 59, 999);

      const { data: prevOrders } = await supabase
        .from('orders')
        .select('total_price, net_profit')
        .eq('store_id', store.id)
        .gte('order_created_at', dayBefore.toISOString())
        .lte('order_created_at', dayBeforeEnd.toISOString());

      const prevRevenue = prevOrders?.reduce((sum, o) => sum + (o.total_price || 0), 0) || 0;
      const prevProfit = prevOrders?.reduce((sum, o) => sum + (o.net_profit || 0), 0) || 0;

      const emailData: DailyDigestData = {
        storeName: store.store_name,
        date: yesterday.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        totalRevenue,
        totalProfit,
        totalOrders,
        profitMargin,
        topProducts,
        comparisonRevenue: prevRevenue,
        comparisonProfit: prevProfit,
      };

      const { subject, html } = getDailyDigestEmail(emailData);

      // Send email
      if (store.email) {
        await resend.emails.send({
          from: 'ProfitPulse <noreply@send.argora.ai>',
          to: store.email,
          subject,
          html,
        });
        sent++;
      }
    } catch (error) {
      console.error(`Error sending daily digest to ${store.store_name}:`, error);
      errors++;
    }
  }

  return NextResponse.json({
    success: true,
    sent,
    errors,
    total: stores.length,
  });
}
