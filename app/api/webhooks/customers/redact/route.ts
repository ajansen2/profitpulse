import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GDPR Customer Redact Webhook
 * Shopify sends this when a customer requests data deletion
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('🗑️ Customer redact request:', {
      shop_domain: body.shop_domain,
      customer_email: body.customer?.email,
    });

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

    if (store && body.customer?.email) {
      // Anonymize customer data in orders
      await supabase
        .from('orders')
        .update({ customer_email: '[REDACTED]' })
        .eq('store_id', store.id)
        .eq('customer_email', body.customer.email);

      console.log('✅ Customer data redacted');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Customer redact error:', error);
    return NextResponse.json({ success: true }); // Always return 200
  }
}
