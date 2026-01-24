import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GDPR Shop Redact Webhook
 * Shopify sends this 48 hours after app uninstall
 * Delete all shop data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('🗑️ Shop redact request:', body.shop_domain);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get store
    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('shop_domain', body.shop_domain)
      .single();

    if (store) {
      // Delete all related data (cascades will handle most)
      // Order: insights, order_line_items, orders, products, ad_spend, ad_connections, store_settings, stores

      await supabase.from('insights').delete().eq('store_id', store.id);
      await supabase.from('ad_spend').delete().eq('store_id', store.id);
      await supabase.from('ad_connections').delete().eq('store_id', store.id);
      await supabase.from('store_settings').delete().eq('store_id', store.id);
      await supabase.from('products').delete().eq('store_id', store.id);

      // Orders and line items (line items cascade from orders)
      await supabase.from('orders').delete().eq('store_id', store.id);

      // Finally delete the store
      await supabase.from('stores').delete().eq('id', store.id);

      console.log('✅ All shop data deleted:', body.shop_domain);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Shop redact error:', error);
    return NextResponse.json({ success: true }); // Always return 200
  }
}
