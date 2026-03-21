import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireActiveSubscription } from '@/lib/check-subscription';

/**
 * Analytics Summary
 * Returns profit metrics for the dashboard
 */
export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get('store_id');
  const days = parseInt(request.nextUrl.searchParams.get('days') || '30');

  if (!storeId) {
    return NextResponse.json({ error: 'Missing store_id' }, { status: 400 });
  }

  // Note: Subscription check temporarily disabled for debugging
  // const subscriptionCheck = await requireActiveSubscription(storeId);
  // if ('error' in subscriptionCheck) {
  //   return subscriptionCheck.error;
  // }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get orders for period
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .eq('store_id', storeId)
    .gte('order_created_at', startDate.toISOString())
    .order('order_created_at', { ascending: false });

  // Get orders for previous period (for comparison)
  const prevStartDate = new Date(startDate);
  prevStartDate.setDate(prevStartDate.getDate() - days);
  const { data: prevOrders } = await supabase
    .from('orders')
    .select('*')
    .eq('store_id', storeId)
    .gte('order_created_at', prevStartDate.toISOString())
    .lt('order_created_at', startDate.toISOString());

  if (error) {
    console.error('Analytics DB error:', error);
    return NextResponse.json({ error: 'Database error', details: error }, { status: 500 });
  }

  // Debug logging
  console.log('Analytics query:', { storeId, days, startDate: startDate.toISOString(), ordersFound: orders?.length || 0 });

  // Calculate summary stats
  const totalOrders = orders?.length || 0;
  const totalRevenue = orders?.reduce((sum, o) => sum + (o.total_price || 0), 0) || 0;
  const totalCogs = orders?.reduce((sum, o) => sum + (o.total_cogs || 0), 0) || 0;
  const totalGrossProfit = orders?.reduce((sum, o) => sum + (o.gross_profit || 0), 0) || 0;
  const totalNetProfit = orders?.reduce((sum, o) => sum + (o.net_profit || 0), 0) || 0;
  const totalFees = orders?.reduce((sum, o) => sum + (o.payment_processing_fee || 0) + (o.shopify_fee || 0), 0) || 0;

  const avgProfitMargin = totalOrders > 0
    ? orders.reduce((sum, o) => sum + (o.profit_margin || 0), 0) / totalOrders
    : 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const avgProfitPerOrder = totalOrders > 0 ? totalNetProfit / totalOrders : 0;

  // Calculate previous period stats for comparison
  const prevTotalOrders = prevOrders?.length || 0;
  const prevTotalRevenue = prevOrders?.reduce((sum, o) => sum + (o.total_price || 0), 0) || 0;
  const prevTotalNetProfit = prevOrders?.reduce((sum, o) => sum + (o.net_profit || 0), 0) || 0;
  const prevAvgOrderValue = prevTotalOrders > 0 ? prevTotalRevenue / prevTotalOrders : 0;

  // Calculate percentage changes
  const revenueChange = prevTotalRevenue > 0 ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 : 0;
  const profitChange = prevTotalNetProfit > 0 ? ((totalNetProfit - prevTotalNetProfit) / prevTotalNetProfit) * 100 : 0;
  const ordersChange = prevTotalOrders > 0 ? ((totalOrders - prevTotalOrders) / prevTotalOrders) * 100 : 0;
  const aovChange = prevAvgOrderValue > 0 ? ((avgOrderValue - prevAvgOrderValue) / prevAvgOrderValue) * 100 : 0;

  // Get ad spend for period
  const { data: adSpend } = await supabase
    .from('ad_spend')
    .select('spend, platform')
    .eq('store_id', storeId)
    .gte('date', startDate.toISOString().split('T')[0]);

  const totalAdSpend = adSpend?.reduce((sum, a) => sum + (a.spend || 0), 0) || 0;
  const roas = totalAdSpend > 0 ? totalRevenue / totalAdSpend : 0;
  const profitAfterAds = totalNetProfit - totalAdSpend;

  // Daily breakdown for chart
  const dailyData: { [key: string]: { revenue: number; profit: number; orders: number; cogs: number } } = {};

  for (const order of orders || []) {
    const date = order.order_created_at?.split('T')[0];
    if (date) {
      if (!dailyData[date]) {
        dailyData[date] = { revenue: 0, profit: 0, orders: 0, cogs: 0 };
      }
      dailyData[date].revenue += order.total_price || 0;
      dailyData[date].profit += order.net_profit || 0;
      dailyData[date].orders += 1;
      dailyData[date].cogs += order.total_cogs || 0;
    }
  }

  const chartData = Object.entries(dailyData)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Top products by profit
  const { data: topProducts } = await supabase
    .from('order_line_items')
    .select('title, shopify_product_id, profit, total_price, quantity')
    .eq('store_id', storeId)
    .order('profit', { ascending: false })
    .limit(100);

  // Aggregate by product
  const productProfits: { [key: string]: { title: string; profit: number; revenue: number; quantity: number } } = {};
  for (const item of topProducts || []) {
    const key = item.shopify_product_id || item.title;
    if (!productProfits[key]) {
      productProfits[key] = { title: item.title, profit: 0, revenue: 0, quantity: 0 };
    }
    productProfits[key].profit += item.profit || 0;
    productProfits[key].revenue += item.total_price || 0;
    productProfits[key].quantity += item.quantity || 0;
  }

  const topProductsList = Object.values(productProfits)
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 10);

  return NextResponse.json({
    summary: {
      totalOrders,
      totalRevenue,
      totalCogs,
      totalGrossProfit,
      totalNetProfit,
      totalFees,
      avgProfitMargin,
      avgOrderValue,
      avgProfitPerOrder,
      totalAdSpend,
      roas,
      profitAfterAds,
    },
    comparison: {
      revenueChange,
      profitChange,
      ordersChange,
      aovChange,
      prevTotalRevenue,
      prevTotalNetProfit,
      prevTotalOrders,
    },
    chartData,
    topProducts: topProductsList,
    recentOrders: orders?.slice(0, 10) || [],
  });
}
