import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Debug endpoint to check order line items
 */
export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get('store_id');

  if (!storeId) {
    return NextResponse.json({ error: 'Missing store_id' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check orders
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, shopify_order_id, total_price, net_profit')
    .eq('store_id', storeId)
    .limit(10);

  // Check line items
  const { data: lineItems, error: lineItemsError } = await supabase
    .from('order_line_items')
    .select('*')
    .eq('store_id', storeId)
    .limit(20);

  // Check if order IDs match
  const orderIds = orders?.map(o => o.shopify_order_id) || [];

  const { data: matchingLineItems } = await supabase
    .from('order_line_items')
    .select('order_id, title, profit')
    .eq('store_id', storeId)
    .in('order_id', orderIds.length > 0 ? orderIds : ['none']);

  return NextResponse.json({
    orders: {
      count: orders?.length || 0,
      error: ordersError,
      sample: orders?.slice(0, 3),
      orderIds: orderIds.slice(0, 5),
    },
    lineItems: {
      count: lineItems?.length || 0,
      error: lineItemsError,
      sample: lineItems?.slice(0, 3),
    },
    matchingLineItems: {
      count: matchingLineItems?.length || 0,
      sample: matchingLineItems?.slice(0, 3),
    },
  });
}
