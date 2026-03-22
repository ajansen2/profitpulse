import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

/**
 * GDPR: Shop Redact
 * Called 48 hours after a merchant uninstalls the app
 * We must delete all data associated with this shop
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const hmac = request.headers.get('x-shopify-hmac-sha256');

    // Verify webhook signature
    const hash = crypto
      .createHmac('sha256', process.env.SHOPIFY_API_SECRET!)
      .update(body, 'utf8')
      .digest('base64');

    if (hmac !== hash) {
      console.error('GDPR webhook: Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const data = JSON.parse(body);
    const shopDomain = data.shop_domain;

    console.log('GDPR Shop Redact:', { shop_domain: shopDomain });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Find the store
    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('shop_domain', shopDomain)
      .single();

    if (store) {
      const storeId = store.id;

      // Delete all store data in order (respecting foreign keys)
      await supabase.from('order_line_items').delete().eq('store_id', storeId);
      await supabase.from('orders').delete().eq('store_id', storeId);
      await supabase.from('products').delete().eq('store_id', storeId);
      await supabase.from('expenses').delete().eq('store_id', storeId);
      await supabase.from('ad_spend').delete().eq('store_id', storeId);
      await supabase.from('store_settings').delete().eq('store_id', storeId);
      await supabase.from('stores').delete().eq('id', storeId);

      console.log('✅ Shop data deleted:', shopDomain);
    }

    return NextResponse.json({
      success: true,
      message: 'Shop data deleted'
    });
  } catch (error) {
    console.error('GDPR shop redact error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
