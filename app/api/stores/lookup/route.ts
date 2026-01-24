import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Store Lookup
 * Get store by shop domain (for embedded app)
 */
export async function GET(request: NextRequest) {
  const shop = request.nextUrl.searchParams.get('shop');

  if (!shop) {
    return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: store, error } = await supabase
    .from('stores')
    .select('*')
    .eq('shop_domain', shop)
    .single();

  if (error || !store) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }

  // Return in merchant/store format for dashboard compatibility
  return NextResponse.json({
    merchant: {
      id: store.id,
      email: store.email,
      full_name: store.store_name,
      company: store.store_name,
      subscription_tier: store.subscription_status === 'active' ? 'pro' : 'trial',
    },
    store: {
      id: store.id,
      store_name: store.store_name,
      shop_domain: store.shop_domain,
      email: store.email,
      subscription_status: store.subscription_status,
      trial_ends_at: store.trial_ends_at,
      store_url: `https://${store.shop_domain}`,
      shopify_domain: store.shop_domain,
      status: 'active',
    }
  });
}
