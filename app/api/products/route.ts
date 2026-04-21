import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyStoreAccess } from '@/lib/verify-session';

/**
 * Products API
 * Manage product COGS data
 */

// GET - List products with COGS
export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get('store_id');

  if (!storeId) {
    return NextResponse.json({ error: 'Missing store_id' }, { status: 400 });
  }

  if (!await verifyStoreAccess(request, storeId)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('store_id', storeId)
    .order('title', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  return NextResponse.json({ products: products || [] });
}

// POST - Update product COGS
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { store_id, shopify_product_id, shopify_variant_id, cost_per_item, shipping_cost, handling_cost, title, sku } = body;

    if (!store_id || !shopify_product_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!await verifyStoreAccess(request, store_id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Upsert product
    const { data, error } = await supabase
      .from('products')
      .upsert({
        store_id,
        shopify_product_id,
        shopify_variant_id: shopify_variant_id || shopify_product_id,
        title,
        sku,
        cost_per_item: cost_per_item || 0,
        shipping_cost: shipping_cost || 0,
        handling_cost: handling_cost || 0,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'store_id,shopify_variant_id',
      })
      .select()
      .single();

    if (error) {
      console.error('Product upsert error:', error);
      return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
    }

    return NextResponse.json({ product: data });
  } catch (error) {
    console.error('Products POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
