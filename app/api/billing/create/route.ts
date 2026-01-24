import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Create Billing Charge
 * Called from dashboard when subscription is not active
 */
export async function POST(request: NextRequest) {
  console.log('💰 [BILLING CREATE] Starting...');

  try {
    const { storeId, shop } = await request.json();
    console.log('💰 [BILLING CREATE] Params:', { storeId, shop });

    if (!storeId || !shop) {
      return NextResponse.json({ error: 'Missing storeId or shop' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get store with access token
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .single();

    if (storeError || !store) {
      console.log('❌ [BILLING CREATE] Store not found');
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const accessToken = store.access_token;

    // Check for valid access token
    if (!accessToken || accessToken === '' || accessToken === 'revoked') {
      console.log('❌ [BILLING CREATE] No valid access token');
      return NextResponse.json({
        error: 'No valid access token - OAuth required',
        needsOAuth: true
      }, { status: 401 });
    }

    const isTestStore = shop.includes('-test') || shop.includes('development');

    // Check for existing charges
    const existingResponse = await fetch(
      `https://${shop}/admin/api/2024-01/recurring_application_charges.json`,
      { headers: { 'X-Shopify-Access-Token': accessToken } }
    );

    if (existingResponse.status === 401 || existingResponse.status === 403) {
      console.log('❌ [BILLING CREATE] Auth error');
      return NextResponse.json({
        error: `Shopify API error: ${existingResponse.status}`,
        needsOAuth: true
      }, { status: 401 });
    }

    if (existingResponse.ok) {
      const charges = await existingResponse.json();
      console.log('💰 [BILLING CREATE] Found charges:', charges.recurring_application_charges?.length || 0);

      // Already has active subscription
      const active = charges.recurring_application_charges?.find((c: any) => c.status === 'active');
      if (active) {
        console.log('✅ [BILLING CREATE] Found active charge');
        await supabase
          .from('stores')
          .update({ subscription_status: 'active', billing_charge_id: active.id.toString() })
          .eq('id', storeId);
        return NextResponse.json({ status: 'active', message: 'Already subscribed' });
      }

      // Has pending charge
      const pending = charges.recurring_application_charges?.find((c: any) => c.status === 'pending');
      if (pending) {
        console.log('💰 [BILLING CREATE] Found pending charge');
        return NextResponse.json({
          status: 'pending',
          confirmationUrl: pending.confirmation_url
        });
      }
    }

    // Create new charge
    const shopName = shop.replace('.myshopify.com', '');
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const returnUrl = `https://admin.shopify.com/store/${shopName}/apps/${clientId}`;

    console.log('💰 [BILLING CREATE] Creating new charge...');

    const chargeResponse = await fetch(
      `https://${shop}/admin/api/2024-01/recurring_application_charges.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recurring_application_charge: {
            name: 'ProfitPulse - Pro Plan',
            price: 99.00,
            trial_days: 7,
            return_url: returnUrl,
            // Only include test flag for dev/test stores
            ...(isTestStore && { test: true }),
          },
        }),
      }
    );

    if (!chargeResponse.ok) {
      const errorData = await chargeResponse.json().catch(() => null);
      console.error('❌ [BILLING CREATE] Failed:', chargeResponse.status, errorData);

      if (chargeResponse.status === 401 || chargeResponse.status === 403) {
        return NextResponse.json({
          error: `Shopify API error: ${chargeResponse.status}`,
          needsOAuth: true
        }, { status: 401 });
      }

      return NextResponse.json({
        error: 'Failed to create billing charge',
        details: errorData
      }, { status: 500 });
    }

    const chargeData = await chargeResponse.json();
    const confirmationUrl = chargeData.recurring_application_charge.confirmation_url;
    console.log('✅ [BILLING CREATE] Charge created');

    return NextResponse.json({
      status: 'created',
      confirmationUrl
    });

  } catch (error) {
    console.error('❌ [BILLING CREATE] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
