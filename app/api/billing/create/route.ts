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
    console.log('💰 [BILLING CREATE] Token starts with:', accessToken?.substring(0, 10) + '...');

    // Check for valid access token
    if (!accessToken || accessToken === '' || accessToken === 'revoked') {
      console.log('❌ [BILLING CREATE] No valid access token');
      return NextResponse.json({
        error: 'No valid access token - OAuth required',
        needsOAuth: true
      }, { status: 401 });
    }

    // First, test if the token works at all with a simple API call
    console.log('💰 [BILLING CREATE] Testing token with shop.json...');
    const testResponse = await fetch(
      `https://${shop}/admin/api/2024-01/shop.json`,
      { headers: { 'X-Shopify-Access-Token': accessToken } }
    );
    console.log('💰 [BILLING CREATE] Shop.json response:', testResponse.status);

    if (!testResponse.ok) {
      const testError = await testResponse.text();
      console.log('❌ [BILLING CREATE] Token invalid - shop.json failed:', testError);
      await supabase
        .from('stores')
        .update({ access_token: 'revoked' })
        .eq('id', storeId);
      return NextResponse.json({
        error: `Token invalid - API test failed: ${testResponse.status}`,
        needsOAuth: true
      }, { status: 401 });
    }
    console.log('✅ [BILLING CREATE] Token valid for shop.json');

    const isTestStore = shop.includes('-test') || shop.includes('development') || shop.includes('dev-');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://profitpulse.app';

    // Check for existing subscriptions using GraphQL
    console.log('💰 [BILLING CREATE] Checking existing subscriptions via GraphQL...');
    const existingResponse = await fetch(
      `https://${shop}/admin/api/2024-01/graphql.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query {
              currentAppInstallation {
                activeSubscriptions {
                  id
                  name
                  status
                }
              }
            }
          `,
        }),
      }
    );

    if (existingResponse.ok) {
      const existingData = await existingResponse.json();
      const activeSubscriptions = existingData.data?.currentAppInstallation?.activeSubscriptions || [];
      console.log('💰 [BILLING CREATE] Found subscriptions:', activeSubscriptions.length);

      // Already has active subscription
      const active = activeSubscriptions.find((s: any) => s.status === 'ACTIVE');
      if (active) {
        console.log('✅ [BILLING CREATE] Found active subscription');
        await supabase
          .from('stores')
          .update({ subscription_status: 'active', billing_charge_id: active.id })
          .eq('id', storeId);
        return NextResponse.json({ status: 'active', message: 'Already subscribed' });
      }
    }

    // Create new subscription using GraphQL (REST API is deprecated)
    const returnUrl = `${appUrl}/api/billing/callback?shop=${shop}&store_id=${storeId}`;

    console.log('💰 [BILLING CREATE] Creating subscription via GraphQL...');

    const chargeResponse = await fetch(
      `https://${shop}/admin/api/2024-01/graphql.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            mutation AppSubscriptionCreate($name: String!, $returnUrl: URL!, $trialDays: Int, $test: Boolean, $lineItems: [AppSubscriptionLineItemInput!]!) {
              appSubscriptionCreate(
                name: $name
                returnUrl: $returnUrl
                trialDays: $trialDays
                test: $test
                lineItems: $lineItems
              ) {
                appSubscription {
                  id
                  status
                }
                confirmationUrl
                userErrors {
                  field
                  message
                }
              }
            }
          `,
          variables: {
            name: 'ProfitPulse Pro',
            returnUrl: returnUrl,
            trialDays: 7,
            test: isTestStore,
            lineItems: [
              {
                plan: {
                  appRecurringPricingDetails: {
                    price: { amount: 29.99, currencyCode: 'USD' },
                    interval: 'EVERY_30_DAYS',
                  },
                },
              },
            ],
          },
        }),
      }
    );

    const chargeData = await chargeResponse.json();
    console.log('💰 [BILLING CREATE] GraphQL response:', JSON.stringify(chargeData, null, 2));

    // Check for GraphQL errors
    if (chargeData.errors) {
      console.error('❌ [BILLING CREATE] GraphQL errors:', chargeData.errors);
      return NextResponse.json({
        error: 'GraphQL error',
        details: chargeData.errors
      }, { status: 500 });
    }

    // Check for user errors
    const userErrors = chargeData.data?.appSubscriptionCreate?.userErrors;
    if (userErrors && userErrors.length > 0) {
      console.error('❌ [BILLING CREATE] User errors:', userErrors);

      // Check if this is a Managed Pricing App
      const isManagedPricing = userErrors.some((e: any) =>
        e.message?.includes('Managed Pricing')
      );

      if (isManagedPricing) {
        console.log('💰 [BILLING CREATE] Managed Pricing App - redirecting to App Store');
        // For managed pricing apps, redirect to Shopify App Store listing
        // The app handle can be found in Partner Dashboard → App Setup → App URL
        const appHandle = 'profitpulse-profit-analytics'; // Update this with your actual app handle
        return NextResponse.json({
          status: 'managed_pricing',
          message: 'This app uses Shopify managed pricing. Please subscribe through the Shopify App Store.',
          appStoreUrl: `https://apps.shopify.com/${appHandle}`,
          // Alternative: redirect to admin apps page where they can manage subscription
          adminUrl: `https://admin.shopify.com/store/${shop.replace('.myshopify.com', '')}/charges/app_subscriptions`
        });
      }

      return NextResponse.json({
        error: userErrors[0].message,
        details: userErrors
      }, { status: 400 });
    }

    const confirmationUrl = chargeData.data?.appSubscriptionCreate?.confirmationUrl;
    if (!confirmationUrl) {
      console.error('❌ [BILLING CREATE] No confirmation URL returned');
      return NextResponse.json({
        error: 'No confirmation URL returned',
        details: chargeData
      }, { status: 500 });
    }

    console.log('✅ [BILLING CREATE] Subscription created, confirmation URL received');

    return NextResponse.json({
      status: 'created',
      confirmationUrl
    });

  } catch (error) {
    console.error('❌ [BILLING CREATE] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
