import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyStoreAccess } from '@/lib/verify-session';

/**
 * Sync Products from Shopify
 * Fetches all products from Shopify and stores them in the database
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { store_id } = body;

    console.log('📦 Product sync started for store_id:', store_id);

    if (!store_id) {
      console.error('❌ Missing store_id');
      return NextResponse.json({ error: 'Missing store_id' }, { status: 400 });
    }

    if (!await verifyStoreAccess(request, store_id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get store with access token
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('shop_domain, access_token')
      .eq('id', store_id)
      .single();

    if (storeError || !store) {
      console.error('❌ Store not found:', storeError);
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    console.log('🏪 Store found:', store.shop_domain);
    console.log('🔑 Access token exists:', !!store.access_token, 'Length:', store.access_token?.length || 0);

    // Check if access token is valid
    if (!store.access_token || store.access_token === '' || store.access_token === 'revoked') {
      console.error('❌ Invalid or missing access token');
      return NextResponse.json({
        error: 'No valid access token. Please reinstall the app to authorize.',
        needsReauth: true
      }, { status: 401 });
    }

    // Fetch products from Shopify (paginated)
    let allProducts: any[] = [];
    let pageInfo: string | null = null;
    let hasNextPage = true;

    while (hasNextPage) {
      const url: string = pageInfo
        ? `https://${store.shop_domain}/admin/api/2024-10/products.json?limit=250&page_info=${pageInfo}`
        : `https://${store.shop_domain}/admin/api/2024-10/products.json?limit=250`;

      console.log('📡 Fetching from Shopify:', url.substring(0, 80) + '...');

      const response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': store.access_token,
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 Shopify response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Shopify API error:', response.status, errorText);
        return NextResponse.json({
          error: 'Shopify API error',
          status: response.status,
          details: errorText
        }, { status: 500 });
      }

      const data = await response.json();
      allProducts = [...allProducts, ...data.products];

      // Check for pagination
      const linkHeader = response.headers.get('Link');
      if (linkHeader && linkHeader.includes('rel="next"')) {
        const match = linkHeader.match(/page_info=([^>]+)>; rel="next"/);
        pageInfo = match ? match[1] : null;
        hasNextPage = !!pageInfo;
      } else {
        hasNextPage = false;
      }
    }

    // Upsert products into database
    let synced = 0;
    for (const product of allProducts) {
      for (const variant of product.variants) {
        await supabase
          .from('products')
          .upsert({
            store_id,
            shopify_product_id: product.id.toString(),
            shopify_variant_id: variant.id.toString(),
            title: variant.title === 'Default Title' ? product.title : `${product.title} - ${variant.title}`,
            sku: variant.sku || '',
            // Only set cost if Shopify has it
            ...(variant.cost && { cost_per_item: parseFloat(variant.cost) }),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'store_id,shopify_variant_id',
          });
        synced++;
      }
    }

    console.log('✅ Product sync complete:', synced, 'variants from', allProducts.length, 'products');

    return NextResponse.json({
      success: true,
      synced,
      total_products: allProducts.length,
    });
  } catch (error) {
    console.error('❌ Product sync error:', error);
    return NextResponse.json({ error: 'Sync failed', details: String(error) }, { status: 500 });
  }
}
