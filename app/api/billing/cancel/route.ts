import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedShop } from '@/lib/verify-session';

/**
 * Cancel Subscription
 * Cancels the recurring charge with Shopify and updates store status
 */
export async function POST(request: NextRequest) {
  console.log('🚫 [BILLING CANCEL] Starting...');

  try {
    const { storeId, shop, reason } = await request.json();
    console.log('🚫 [BILLING CANCEL] Params:', { storeId, shop, reason });

    if (!storeId || !shop) {
      return NextResponse.json({ error: 'Missing storeId or shop' }, { status: 400 });
    }

    const authenticatedShop = getAuthenticatedShop(request, true);
    if (!authenticatedShop) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get store with access token and billing charge ID
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .single();

    if (storeError || !store) {
      console.log('❌ [BILLING CANCEL] Store not found');
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const accessToken = store.access_token;
    const chargeId = store.billing_charge_id;

    if (!accessToken || accessToken === 'revoked') {
      return NextResponse.json({ error: 'No valid access token' }, { status: 401 });
    }

    // Cancel the recurring charge if we have one
    if (chargeId) {
      console.log('🚫 [BILLING CANCEL] Canceling charge:', chargeId);

      const cancelResponse = await fetch(
        `https://${shop}/admin/api/2024-01/recurring_application_charges/${chargeId}.json`,
        {
          method: 'DELETE',
          headers: { 'X-Shopify-Access-Token': accessToken },
        }
      );

      if (!cancelResponse.ok && cancelResponse.status !== 404) {
        console.error('❌ [BILLING CANCEL] Failed to cancel charge:', cancelResponse.status);
        // Continue anyway - we'll update our status
      }
    }

    // Update store subscription status
    await supabase
      .from('stores')
      .update({
        subscription_status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason || null,
      })
      .eq('id', storeId);

    // Log cancellation for analytics (table might not exist, that's ok)
    try {
      await supabase.from('cancellation_feedback').insert({
        store_id: storeId,
        reason: reason || 'No reason provided',
        cancelled_at: new Date().toISOString(),
      });
    } catch {
      // Table doesn't exist, ignore
    }

    console.log('✅ [BILLING CANCEL] Subscription cancelled');

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully',
    });

  } catch (error) {
    console.error('❌ [BILLING CANCEL] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
