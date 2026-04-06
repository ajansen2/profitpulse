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
      return NextResponse.json({ error: 'Failed to fetch from Shopify' }, { status: 500 });
    }

    const { products } = await response.json();

    // Get existing products in our DB
    const { data: dbProducts } = await supabase
      .from('products')
      .select('shopify_variant_id')
      .eq('store_id', store_id);

    // Build a map of variant ID -> inventory quantity from Shopify
    const inventoryMap: { [key: string]: number } = {};
    for (const product of products || []) {
      for (const variant of product.variants || []) {
        inventoryMap[String(variant.id)] = variant.inventory_quantity || 0;
      }
    }

    // Create a set of DB variant IDs for fast lookup
    const dbVariantIdSet = new Set(dbProducts?.map(p => String(p.shopify_variant_id)) || []);

    // Find matching IDs and update
    const matchingIds = Object.keys(inventoryMap).filter(id => dbVariantIdSet.has(id));

    let synced = 0;

    for (const variantId of matchingIds) {
      const { data } = await supabase
        .from('products')
        .update({
          inventory_quantity: inventoryMap[variantId],
          inventory_updated_at: new Date().toISOString(),
        })
        .eq('store_id', store_id)
        .eq('shopify_variant_id', variantId)
        .select('id');

      if (data && data.length > 0) {
        synced++;
      }
    }

    return NextResponse.json({ success: true, synced });
  } catch (error) {
    console.error('Inventory sync error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
