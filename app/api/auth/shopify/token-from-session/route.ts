import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Get access token from Shopify session token
 * This is a workaround for when OAuth callback fails to save the token
 * Uses the session token to exchange for an offline access token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shop, session_token } = body;

    console.log('🔄 Token from session for shop:', shop);

    if (!shop) {
      return NextResponse.json({ error: 'Missing shop' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get store record
    const { data: store } = await supabase
      .from('stores')
      .select('id, access_token')
      .eq('shop_domain', shop)
      .single();

    const clientId = process.env.SHOPIFY_API_KEY;
    const clientSecret = process.env.SHOPIFY_API_SECRET;

    // ALWAYS try token exchange when session_token is provided
    // This ensures we get a fresh token even if the stored one looks valid but is actually revoked
    if (session_token) {
      // Try token exchange with session token
      const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
          subject_token: session_token,
          subject_token_type: 'urn:ietf:params:oauth:token-type:id_token',
          requested_token_type: 'urn:shopify:params:oauth:token-type:offline-access-token',
        }),
      });

      console.log('📡 Token exchange response:', tokenResponse.status);

      if (tokenResponse.ok) {
        const data = await tokenResponse.json();
        console.log('✅ Got access token via exchange');

        // Update store with new token
        if (store) {
          await supabase
            .from('stores')
            .update({
              access_token: data.access_token,
              scope: data.scope || '',
              updated_at: new Date().toISOString(),
            })
            .eq('id', store.id);
        }

        return NextResponse.json({
          success: true,
          message: 'Token exchanged successfully',
          store_id: store?.id
        });
      } else {
        const errorText = await tokenResponse.text();
        console.error('❌ Token exchange failed:', errorText);
        return NextResponse.json({
          error: 'Token exchange failed',
          details: errorText
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      error: 'No session token provided',
      hint: 'Reinstall the app to get a fresh OAuth flow'
    }, { status: 400 });

  } catch (error) {
    console.error('❌ Token from session error:', error);
    return NextResponse.json({ error: 'Failed', details: String(error) }, { status: 500 });
  }
}
