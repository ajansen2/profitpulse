import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Linked Stores API
 * Finds all stores that share the same owner email
 * Used for multi-store management
 */
export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get('store_id');

  if (!storeId) {
    return NextResponse.json({ error: 'Missing store_id' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get current store's email
  const { data: currentStore, error: storeError } = await supabase
    .from('stores')
    .select('email, shop_domain')
    .eq('id', storeId)
    .single();

  if (storeError || !currentStore?.email) {
    return NextResponse.json({ stores: [] });
  }

  // Find other stores with the same email
  const { data: linkedStores, error } = await supabase
    .from('stores')
    .select('id, shop_domain, store_name, subscription_status')
    .eq('email', currentStore.email)
    .neq('id', storeId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error finding linked stores:', error);
    return NextResponse.json({ stores: [] });
  }

  return NextResponse.json({
    stores: linkedStores || [],
    currentDomain: currentStore.shop_domain,
  });
}
