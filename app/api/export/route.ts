import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyStoreAccess } from '@/lib/verify-session';

/**
 * CSV Export API
 * Exports orders, products, or analytics data as CSV
 */
export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get('store_id');
  const exportType = request.nextUrl.searchParams.get('type'); // orders, products, analytics
  const days = parseInt(request.nextUrl.searchParams.get('days') || '30');

  if (!storeId) {
    return NextResponse.json({ error: 'Missing store_id' }, { status: 400 });
  }

  if (!await verifyStoreAccess(request, storeId)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!exportType || !['orders', 'products', 'analytics'].includes(exportType)) {
    return NextResponse.json({ error: 'Invalid export type. Use: orders, products, or analytics' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let csv = '';
  let filename = '';

  try {
    if (exportType === 'orders') {
      // Export orders
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('store_id', storeId)
        .gte('order_created_at', startDate.toISOString())
        .order('order_created_at', { ascending: false });

      if (error) throw error;

      // CSV header
      csv = 'Order Number,Date,Customer Email,Subtotal,Total,Tax,Shipping,Discounts,COGS,Payment Fee,Shopify Fee,Gross Profit,Net Profit,Margin %,Platform,Currency\n';

      // CSV rows
      for (const order of orders || []) {
        const row = [
          order.order_number,
          order.order_created_at?.split('T')[0] || '',
          order.customer_email || '',
          (order.subtotal_price || 0).toFixed(2),
          (order.total_price || 0).toFixed(2),
          (order.total_tax || 0).toFixed(2),
          (order.total_shipping || 0).toFixed(2),
          (order.total_discounts || 0).toFixed(2),
          (order.total_cogs || 0).toFixed(2),
          (order.payment_processing_fee || 0).toFixed(2),
          (order.shopify_fee || 0).toFixed(2),
          (order.gross_profit || 0).toFixed(2),
          (order.net_profit || 0).toFixed(2),
          (order.profit_margin || 0).toFixed(1),
          order.attributed_platform || 'direct',
          order.currency || 'USD',
        ].map(escapeCSV).join(',');
        csv += row + '\n';
      }

      filename = `orders-export-${days}days-${new Date().toISOString().split('T')[0]}.csv`;

    } else if (exportType === 'products') {
      // Export products
      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', storeId)
        .order('title', { ascending: true });

      if (error) throw error;

      // CSV header
      csv = 'Product Title,Variant Title,SKU,Price,Cost Per Item,Profit Per Item,Margin %,Inventory,Low Stock Threshold\n';

      // CSV rows
      for (const product of products || []) {
        const profit = (product.price || 0) - (product.cost_per_item || 0);
        const margin = product.price > 0 ? (profit / product.price) * 100 : 0;

        const row = [
          product.title || '',
          product.variant_title || '',
          product.sku || '',
          (product.price || 0).toFixed(2),
          (product.cost_per_item || 0).toFixed(2),
          profit.toFixed(2),
          margin.toFixed(1),
          product.inventory_quantity || 0,
          product.low_stock_threshold || 10,
        ].map(escapeCSV).join(',');
        csv += row + '\n';
      }

      filename = `products-export-${new Date().toISOString().split('T')[0]}.csv`;

    } else if (exportType === 'analytics') {
      // Export daily analytics
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: orders, error } = await supabase
        .from('orders')
        .select('order_created_at, total_price, total_cogs, net_profit, gross_profit, payment_processing_fee, shopify_fee')
        .eq('store_id', storeId)
        .gte('order_created_at', startDate.toISOString())
        .order('order_created_at', { ascending: true });

      if (error) throw error;

      // Aggregate by day
      const dailyData: {
        [key: string]: {
          revenue: number;
          cogs: number;
          grossProfit: number;
          netProfit: number;
          fees: number;
          orders: number;
        };
      } = {};

      for (const order of orders || []) {
        const date = order.order_created_at?.split('T')[0];
        if (date) {
          if (!dailyData[date]) {
            dailyData[date] = { revenue: 0, cogs: 0, grossProfit: 0, netProfit: 0, fees: 0, orders: 0 };
          }
          dailyData[date].revenue += order.total_price || 0;
          dailyData[date].cogs += order.total_cogs || 0;
          dailyData[date].grossProfit += order.gross_profit || 0;
          dailyData[date].netProfit += order.net_profit || 0;
          dailyData[date].fees += (order.payment_processing_fee || 0) + (order.shopify_fee || 0);
          dailyData[date].orders += 1;
        }
      }

      // CSV header
      csv = 'Date,Orders,Revenue,COGS,Fees,Gross Profit,Net Profit,Margin %\n';

      // CSV rows sorted by date
      const sortedDates = Object.keys(dailyData).sort();
      for (const date of sortedDates) {
        const d = dailyData[date];
        const margin = d.revenue > 0 ? (d.netProfit / d.revenue) * 100 : 0;

        const row = [
          date,
          d.orders,
          d.revenue.toFixed(2),
          d.cogs.toFixed(2),
          d.fees.toFixed(2),
          d.grossProfit.toFixed(2),
          d.netProfit.toFixed(2),
          margin.toFixed(1),
        ].map(escapeCSV).join(',');
        csv += row + '\n';
      }

      filename = `analytics-export-${days}days-${new Date().toISOString().split('T')[0]}.csv`;
    }

    // Return CSV as downloadable file
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

/**
 * Escape a value for CSV (handle commas, quotes, newlines)
 */
function escapeCSV(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
