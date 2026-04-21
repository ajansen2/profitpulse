import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ProfitPulse API key fallback
const getApiKey = () => process.env.SHOPIFY_API_KEY!;

/**
 * Returns an HTML page that redirects window.top (breaks out of Shopify iframe).
 */
function topLevelRedirectHTML(url: string, message: string = 'Redirecting...'): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><title>${message}</title>
<style>body{background:#0a0a0a;color:white;font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}.loader{text-align:center}.spinner{width:40px;height:40px;border:3px solid #333;border-top:3px solid #8b5cf6;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 16px}@keyframes spin{to{transform:rotate(360deg)}}</style>
</head>
<body><div class="loader"><div class="spinner"></div><p>${message}</p></div>
<script>if(window.top&&window.top!==window.self){window.top.location.href=${JSON.stringify(url)}}else{window.location.href=${JSON.stringify(url)}}</script>
</body></html>`;
}

function htmlRedirect(url: string, message: string = 'Redirecting...') {
  return new NextResponse(
    topLevelRedirectHTML(url, message),
    { status: 200, headers: { 'Content-Type': 'text/html' } }
  );
}

export async function GET(request: NextRequest) {
  try {
    const shop = request.nextUrl.searchParams.get('shop');
    const chargeId = request.nextUrl.searchParams.get('charge_id');
    const storeId = request.nextUrl.searchParams.get('store_id');

    console.log('💰 Billing callback:', { shop, chargeId, storeId });

    const shopName = shop?.replace('.myshopify.com', '') || '';
    const redirectUrl = `https://admin.shopify.com/store/${shopName}/apps/${getApiKey()}`;

    if (!shop || !chargeId) {
      return htmlRedirect(`${redirectUrl}?billing=error`, 'Billing error...');
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get store access token
    const { data: store } = await supabase
      .from('stores')
      .select('access_token')
      .eq('shop_domain', shop)
      .single();

    if (!store) {
      console.error('❌ Store not found:', shop);
      return htmlRedirect(`${redirectUrl}?billing=error`, 'Billing error...');
    }

    // Verify subscription status via GraphQL (REST recurring_application_charges is deprecated)
    // With appSubscriptionCreate (GraphQL), Shopify auto-activates when merchant approves —
    // no separate activation call needed. Just confirm the subscription is active.
    const graphqlResponse = await fetch(
      `https://${shop}/admin/api/2024-01/graphql.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': store.access_token,
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

    if (!graphqlResponse.ok) {
      console.error('❌ Failed to query subscriptions:', graphqlResponse.status);
      return htmlRedirect(`${redirectUrl}?billing=error`, 'Billing error...');
    }

    const graphqlData = await graphqlResponse.json();
    const activeSubscriptions = graphqlData.data?.currentAppInstallation?.activeSubscriptions || [];

    console.log('📋 Active subscriptions:', activeSubscriptions.length, activeSubscriptions);

    const activeSub = activeSubscriptions.find((s: any) => s.status === 'ACTIVE');

    if (activeSub) {
      // Subscription is active — update store and redirect
      await supabase
        .from('stores')
        .update({
          subscription_status: 'active',
          billing_charge_id: activeSub.id,
          updated_at: new Date().toISOString(),
        })
        .eq('shop_domain', shop);

      console.log('✅ Subscription confirmed active for:', shop);
      return htmlRedirect(`${redirectUrl}?billing=success`, 'Loading ProfitPulse...');
    }

    // No active subscription found — merchant likely declined
    console.log('❌ No active subscription found after billing callback for:', shop);
    await supabase
      .from('stores')
      .update({
        subscription_status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('shop_domain', shop);

    return htmlRedirect(`${redirectUrl}?billing=declined`, 'Loading ProfitPulse...');
  } catch (error) {
    console.error('Billing callback error:', error);
    const shop = request.nextUrl.searchParams.get('shop');
    const shopName = shop?.replace('.myshopify.com', '') || '';
    return htmlRedirect(
      `https://admin.shopify.com/store/${shopName}/apps/${getApiKey()}?billing=error`,
      'Billing error...'
    );
  }
}
