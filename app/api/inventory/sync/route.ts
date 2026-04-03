import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Inventory Sync API
 * Pulls current inventory levels from Shopify
 */
export async function POST(request: NextRequest) {
  try {
    const { store_id } = await request.json();

    if (!store_id) {
      return NextResponse.json({ error: 'Missing store_id' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get store credentials
    const { data: store } = await supabase
      .from('stores')
      .select('shop_domain, access_token')
      .eq('id', store_id)
      .single();

    if (!store?.access_token) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // Fetch products with inventory from Shopify
    const response = await fetch(
      `https://${store.shop_domain}/admin/api/2024-01/products.json?fields=id,title,variants&limit=250`,
      {
        headers: {
          'X-Shopify-Access-Token': store.access_token,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('Shopify API error:', response.status);
      return NextResponse.json({ error: 'Failed to fetch from Shopify' }, { status: 500 });
    }

    const { products } = await response.json();

    let synced = 0;

    // Update inventory for each product variant
    for (const product of products || []) {
      for (const variant of product.variants || []) {
        const inventoryQuantity = variant.inventory_quantity || 0;

        const { error } = await supabase
          .from('products')
          .update({
            inventory_quantity: inventoryQuantity,
            inventory_updated_at: new Date().toISOString(),
          })
          .eq('store_id', store_id)
          .eq('shopify_variant_id', String(variant.id));

        if (!error) synced++;
      }
    }

    return NextResponse.json({ success: true, synced });
  } catch (error) {
    console.error('Inventory sync error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
