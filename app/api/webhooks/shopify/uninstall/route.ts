import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

/**
 * App Uninstall Webhook
 * Marks store as uninstalled (doesn't delete data - they might reinstall)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const hmac = request.headers.get('x-shopify-hmac-sha256');
    const shop = request.headers.get('x-shopify-shop-domain');

    console.log('🗑️ Uninstall webhook from:', shop);

    // Validate HMAC
    const secret = process.env.SHOPIFY_API_SECRET!;
    const generatedHmac = crypto
      .createHmac('sha256', secret)
      .update(body, 'utf8')
      .digest('base64');

    if (generatedHmac !== hmac) {
      console.error('❌ Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Mark store as uninstalled
    const { error } = await supabase
      .from('stores')
      .update({
        access_token: 'revoked',
        subscription_status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('shop_domain', shop);

    if (error) {
      console.error('❌ Failed to update store:', error);
    } else {
      console.log('✅ Store marked as uninstalled:', shop);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ Uninstall webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
