import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const hmac = request.headers.get('x-shopify-hmac-sha256');
    const shop = request.headers.get('x-shopify-shop-domain');
    const topic = request.headers.get('x-shopify-topic');

    console.log('📥 Subscription webhook received:', { shop, topic });

    // Verify HMAC
    const secret = process.env.SHOPIFY_API_SECRET;
    if (secret && hmac) {
      const generatedHmac = crypto
        .createHmac('sha256', secret)
        .update(body, 'utf8')
        .digest('base64');

      if (generatedHmac !== hmac) {
        console.error('❌ Invalid HMAC signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const data = JSON.parse(body);
    console.log('📦 Subscription data:', JSON.stringify(data, null, 2));

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Find the store by shop domain
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('shop_domain', shop)
      .single();

    if (storeError || !store) {
      console.error('❌ Store not found:', shop);
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // Update subscription status based on the webhook data
    const status = data.app_subscription?.status?.toLowerCase();
    let subscriptionStatus = 'trial';

    if (status === 'active') {
      subscriptionStatus = 'active';
    } else if (status === 'cancelled' || status === 'expired' || status === 'frozen') {
      subscriptionStatus = 'cancelled';
    } else if (status === 'pending') {
      subscriptionStatus = 'trial';
    }

    console.log('💰 Updating store subscription status to:', subscriptionStatus);

    const { error: updateError } = await supabase
      .from('stores')
      .update({
        subscription_status: subscriptionStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', store.id);

    if (updateError) {
      console.error('❌ Failed to update store:', updateError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    console.log('✅ Store subscription updated successfully');
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ Subscription webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
