import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

/**
 * GDPR Compliance Webhooks Handler
 * Handles all three compliance webhook topics:
 * - customers/data_request
 * - customers/redact
 * - shop/redact
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const hmac = request.headers.get('x-shopify-hmac-sha256');
    const topic = request.headers.get('x-shopify-topic');

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
    console.log('GDPR Webhook received:', { topic, shop_domain: data.shop_domain });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    switch (topic) {
      case 'customers/data_request':
        // Customer requests their data
        // ProfitPulse doesn't store customer PII - only order-level financial data
        console.log('Customer data request:', data.customer?.id);
        return NextResponse.json({
          success: true,
          message: 'No customer PII stored by ProfitPulse'
        });

      case 'customers/redact':
        // Customer requests data deletion
        // ProfitPulse doesn't store customer PII
        console.log('Customer redact request:', data.customer?.id);
        return NextResponse.json({
          success: true,
          message: 'No customer PII to redact'
        });

      case 'shop/redact':
        // Shop requests all data deletion (48hrs after uninstall)
        const shopDomain = data.shop_domain;
        console.log('Shop redact request:', shopDomain);

        // Find and delete all store data
        const { data: store } = await supabase
          .from('stores')
          .select('id')
          .eq('shop_domain', shopDomain)
          .single();

        if (store) {
          const storeId = store.id;
          // Delete in order (respecting foreign keys)
          await supabase.from('order_line_items').delete().eq('store_id', storeId);
          await supabase.from('orders').delete().eq('store_id', storeId);
          await supabase.from('products').delete().eq('store_id', storeId);
          await supabase.from('expenses').delete().eq('store_id', storeId);
          await supabase.from('ad_spend').delete().eq('store_id', storeId);
          await supabase.from('store_settings').delete().eq('store_id', storeId);
          await supabase.from('stores').delete().eq('id', storeId);
          console.log('Shop data deleted:', shopDomain);
        }

        return NextResponse.json({
          success: true,
          message: 'Shop data deleted'
        });

      default:
        console.log('Unknown GDPR topic:', topic);
        return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error('GDPR webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
