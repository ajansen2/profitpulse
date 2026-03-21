import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Debug endpoint to list stores
 */
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: stores } = await supabase
    .from('stores')
    .select('id, store_name, shop_domain')
    .limit(10);

  const { data: orders } = await supabase
    .from('orders')
    .select('id, store_id, shopify_order_id, order_number')
    .limit(5);

  return NextResponse.json({ stores, orders });
}
