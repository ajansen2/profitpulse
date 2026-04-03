import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Shared Dashboard View API
 * Returns dashboard data for a valid share token
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Find the share link
  const { data: link, error: linkError } = await supabase
    .from('share_links')
    .select('*, stores(id, store_name, email)')
    .eq('token', token)
    .single();

  if (linkError || !link) {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
  }

  // Check expiration
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This share link has expired' }, { status: 410 });
  }

  // Update last accessed
  await supabase
    .from('share_links')
    .update({ last_accessed_at: new Date().toISOString() })
    .eq('id', link.id);

  const store = link.stores as { id: string; store_name: string; email: string };
  const storeId = store.id;

  // Get last 30 days of data
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  // Fetch analytics
  const { data: orders } = await supabase
    .from('orders')
    .select('total_price, net_profit, order_created_at')
    .eq('store_id', storeId)
    .gte('order_created_at', startDate.toISOString())
    .order('order_created_at', { ascending: false });

  const totalRevenue = orders?.reduce((sum, o) => sum + (o.total_price || 0), 0) || 0;
  const totalNetProfit = orders?.reduce((sum, o) => sum + (o.net_profit || 0), 0) || 0;
  const totalOrders = orders?.length || 0;
  const avgProfitMargin = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;

  // Get top products if permission allows
  let topProducts: { title: string; profit: number; revenue: number }[] = [];

  if (link.permissions?.viewProducts !== false && orders && orders.length > 0) {
    const { data: lineItems } = await supabase
      .from('order_line_items')
      .select('title, shopify_product_id, profit, total_price')
      .eq('store_id', storeId);

    const productProfits: { [key: string]: { title: string; profit: number; revenue: number } } = {};
    for (const item of lineItems || []) {
      const key = item.shopify_product_id || item.title;
      if (!productProfits[key]) {
        productProfits[key] = { title: item.title, profit: 0, revenue: 0 };
      }
      productProfits[key].profit += item.profit || 0;
      productProfits[key].revenue += item.total_price || 0;
    }

    topProducts = Object.values(productProfits)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10);
  }

  // Daily chart data
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

  const chartData = Object.entries(dailyData)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({
    storeName: store.store_name,
    sharedBy: link.name || 'Store Owner',
    summary: {
      totalRevenue,
      totalNetProfit,
      totalOrders,
      avgProfitMargin,
    },
    chartData,
    topProducts,
  });
}
