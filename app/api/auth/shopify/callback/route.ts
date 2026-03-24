import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

/**
 * Shopify OAuth Callback
 * Handles token exchange, store creation, webhook registration, and billing
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    // Get shop from URL params OR from cookie (fallback for managed install)
    let shop = searchParams.get('shop');
    const code = searchParams.get('code');
    const hmac = searchParams.get('hmac');

    // If no shop in URL, try to get from cookie
    if (!shop) {
      shop = request.cookies.get('shopify_oauth_shop')?.value || null;
      console.log('🔐 OAuth callback - shop from cookie:', shop);
    } else {
      console.log('🔐 OAuth callback for shop:', shop);
    }

    if (!shop || !code) {
      console.error('❌ Missing shop or code. Shop:', shop, 'Code:', !!code);
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Validate HMAC
    const secret = process.env.SHOPIFY_API_SECRET!;
    const params = new URLSearchParams(searchParams);
    params.delete('hmac');
    params.sort();
    const message = params.toString();
    const generatedHmac = crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest('hex');

    if (generatedHmac !== hmac) {
      console.error('❌ Invalid HMAC');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    console.log('✅ HMAC validated');

    // Exchange code for access token
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('❌ Token exchange failed:', tokenResponse.status, errorText);
      return NextResponse.json({ error: 'Token exchange failed', details: errorText }, { status: 500 });
    }

    const tokenData = await tokenResponse.json();
    const { access_token, scope } = tokenData;
    console.log('✅ Got access token, length:', access_token?.length, 'scope:', scope);

    // Get shop info
    const shopResponse = await fetch(`https://${shop}/admin/api/2024-01/shop.json`, {
      headers: { 'X-Shopify-Access-Token': access_token },
    });

    if (!shopResponse.ok) {
      console.error('❌ Failed to get shop info');
      return NextResponse.json({ error: 'Failed to get shop info' }, { status: 500 });
    }

    const shopData = await shopResponse.json();
    console.log('✅ Got shop info:', shopData.shop.name);

    // Save to Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('🏪 Checking for existing store:', shop);

    // Check if store already exists
    const { data: existingStore } = await supabase
      .from('stores')
      .select('*')
      .eq('shop_domain', shop)
      .maybeSingle();

    let store;
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    if (existingStore) {
      console.log('✅ Store exists, updating...');
      // Update existing store
      const { data: updatedStore, error: updateError } = await supabase
        .from('stores')
        .update({
          access_token,
          scope,
          store_name: shopData.shop.name,
          email: shopData.shop.email,
          currency: shopData.shop.currency,
          timezone: shopData.shop.iana_timezone,
          subscription_status: 'trial',
          trial_ends_at: trialEndsAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingStore.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Failed to update store:', updateError);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }
      store = updatedStore;
    } else {
      console.log('🆕 Creating new store...');
      // Create new store
      const { data: newStore, error: insertError } = await supabase
        .from('stores')
        .insert({
          shop_domain: shop,
          store_name: shopData.shop.name,
          email: shopData.shop.email,
          access_token,
          scope,
          subscription_status: 'trial',
          trial_ends_at: trialEndsAt,
          currency: shopData.shop.currency,
          timezone: shopData.shop.iana_timezone,
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Failed to create store:', insertError);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }
      store = newStore;
    }

    console.log('✅ Store ready:', store.id);

    // Create default store settings
    await supabase
      .from('store_settings')
      .upsert({
        store_id: store.id,
        default_cogs_percentage: 30,
        payment_processing_rate: 0.029,
        payment_processing_fixed: 0.30,
        shopify_fee_rate: 0.02,
      }, {
        onConflict: 'store_id',
      });

    // Register webhooks
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    try {
      // Register app/uninstalled webhook
      await fetch(`https://${shop}/admin/api/2024-01/webhooks.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': access_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhook: {
            topic: 'app/uninstalled',
            address: `${appUrl}/api/webhooks/shopify/uninstall`
          }
        }),
      });
      console.log('✅ Registered app/uninstalled webhook');

      // Register subscription webhook for billing status changes
      const subscriptionResult = await fetch(`https://${shop}/admin/api/2024-01/webhooks.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': access_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhook: {
            topic: 'app_subscriptions/update',
            address: `${appUrl}/api/webhooks/shopify/subscription`
          }
        }),
      });
      console.log('💰 Subscription webhook:', subscriptionResult.ok ? '✅' : '❌');
    } catch (e) {
      console.log('⚠️ Webhook registration failed');
    }

    // Create billing charge
    console.log('💰 Creating billing charge...');

    const isTestStore = shop.includes('-test') || shop.includes('development');
    const shopName = shop.replace('.myshopify.com', '');
    const clientId = process.env.SHOPIFY_API_KEY;
    const returnUrl = `${appUrl}/api/billing/callback?shop=${shop}&store_id=${store.id}`;

    const chargeResponse = await fetch(`https://${shop}/admin/api/2024-01/recurring_application_charges.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': access_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recurring_application_charge: {
          name: 'ProfitPulse Pro',
          price: 29.99,
          trial_days: 7,
          return_url: returnUrl,
          // IMPORTANT: Only include test flag for dev/test stores
          ...(isTestStore && { test: true }),
        }
      })
    });

    if (chargeResponse.ok) {
      const chargeData = await chargeResponse.json();
      const confirmationUrl = chargeData.recurring_application_charge.confirmation_url;
      console.log('✅ Billing charge created, redirecting to approval');

      // Clear OAuth cookies
      const response = NextResponse.redirect(confirmationUrl);
      response.cookies.delete('shopify_oauth_state');
      response.cookies.delete('shopify_oauth_shop');
      return response;
    }

    // Billing failed - redirect to app anyway
    console.error('❌ Billing charge creation failed:', chargeResponse.status);
    const response = NextResponse.redirect(`https://admin.shopify.com/store/${shopName}/apps/${clientId}?billing_error=true`);
    response.cookies.delete('shopify_oauth_state');
    response.cookies.delete('shopify_oauth_shop');
    return response;

  } catch (error) {
    console.error('❌ OAuth callback error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
