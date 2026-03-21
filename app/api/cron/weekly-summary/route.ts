import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { getWeeklySummaryEmail, WeeklySummaryData } from '@/lib/email-templates';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Weekly Summary Cron Job
 * Sends weekly profit summary to all stores with weekly summary enabled
 * Schedule: Every Monday at 8am EST
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

  // Get all stores with weekly summary enabled
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
      // Check if store has weekly summary enabled
      const { data: settings } = await supabase
        .from('store_settings')
        .select('email_weekly_summary')
        .eq('store_id', store.id)
        .single();

      if (!settings?.email_weekly_summary) continue;

      // Get last week's data (Monday to Sunday)
      const today = new Date();
      const lastSunday = new Date(today);
      lastSunday.setDate(today.getDate() - today.getDay());
      lastSunday.setHours(23, 59, 59, 999);

      const lastMonday = new Date(lastSunday);
      lastMonday.setDate(lastSunday.getDate() - 6);
      lastMonday.setHours(0, 0, 0, 0);

      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('store_id', store.id)
        .gte('order_created_at', lastMonday.toISOString())
        .lte('order_created_at', lastSunday.toISOString());

      const totalRevenue = orders?.reduce((sum, o) => sum + (o.total_price || 0), 0) || 0;
      const totalProfit = orders?.reduce((sum, o) => sum + (o.net_profit || 0), 0) || 0;
      const totalOrders = orders?.length || 0;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      // Get top products
      const orderIds = orders?.map(o => o.shopify_order_id) || [];
      let topProducts: { title: string; profit: number; quantity: number }[] = [];

      if (orderIds.length > 0) {
        const { data: lineItems } = await supabase
          .from('order_line_items')
          .select('title, shopify_product_id, profit, quantity')
          .eq('store_id', store.id)
          .in('order_id', orderIds);

        const productStats: Record<string, { title: string; profit: number; quantity: number }> = {};
        for (const item of lineItems || []) {
          const key = item.shopify_product_id || item.title;
          if (!productStats[key]) {
            productStats[key] = { title: item.title, profit: 0, quantity: 0 };
          }
          productStats[key].profit += item.profit || 0;
          productStats[key].quantity += item.quantity || 0;
        }
        topProducts = Object.values(productStats)
          .sort((a, b) => b.profit - a.profit)
          .slice(0, 5);
      }

      // Daily breakdown
      const dailyData: { [key: string]: { revenue: number; profit: number } } = {};
      for (const order of orders || []) {
        const date = order.order_created_at?.split('T')[0];
        if (date) {
          if (!dailyData[date]) {
            dailyData[date] = { revenue: 0, profit: 0 };
          }
          dailyData[date].revenue += order.total_price || 0;
          dailyData[date].profit += order.net_profit || 0;
        }
      }
      const dailyBreakdown = Object.entries(dailyData)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Get previous week for comparison
      const prevSunday = new Date(lastMonday);
      prevSunday.setDate(lastMonday.getDate() - 1);
      prevSunday.setHours(23, 59, 59, 999);

      const prevMonday = new Date(prevSunday);
      prevMonday.setDate(prevSunday.getDate() - 6);
      prevMonday.setHours(0, 0, 0, 0);

      const { data: prevOrders } = await supabase
        .from('orders')
        .select('total_price, net_profit')
        .eq('store_id', store.id)
        .gte('order_created_at', prevMonday.toISOString())
        .lte('order_created_at', prevSunday.toISOString());

      const prevRevenue = prevOrders?.reduce((sum, o) => sum + (o.total_price || 0), 0) || 0;
      const prevProfit = prevOrders?.reduce((sum, o) => sum + (o.net_profit || 0), 0) || 0;

      const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
      const profitChange = prevProfit > 0 ? ((totalProfit - prevProfit) / prevProfit) * 100 : 0;

      const emailData: WeeklySummaryData = {
        storeName: store.store_name,
        weekStart: lastMonday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        weekEnd: lastSunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        totalRevenue,
        totalProfit,
        totalOrders,
        avgOrderValue,
        profitMargin,
        revenueChange,
        profitChange,
        topProducts,
        dailyBreakdown,
      };

      const { subject, html } = getWeeklySummaryEmail(emailData);

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
      console.error(`Error sending weekly summary to ${store.store_name}:`, error);
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
