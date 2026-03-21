import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Handle first-time app installation for embedded apps
 * Called when dashboard loads and store not found in database
 * This is a fallback - the OAuth callback should have already created the store
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shop } = body;

    if (!shop) {
      return NextResponse.json({ error: 'Shop parameter required' }, { status: 400 });
    }

    console.log('🔧 Install-embedded called for shop:', shop);

    // Initialize Supabase with service role key for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if store already exists
    const { data: existingStore, error: lookupError } = await supabase
      .from('stores')
      .select('*')
      .eq('shop_domain', shop)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lookupError) {
      console.error('❌ Error looking up store:', lookupError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (existingStore) {
      console.log('✅ Store already exists:', existingStore.id);
      return NextResponse.json({
        store: {
          id: existingStore.id,
          store_name: existingStore.store_name || shop.replace('.myshopify.com', ''),
          shop_domain: shop,
          email: existingStore.email || '',
          subscription_status: existingStore.subscription_status || 'trial',
          trial_ends_at: existingStore.trial_ends_at || null,
        }
      });
    }

    // Store doesn't exist - create placeholder
    // This happens when OAuth callback failed to save the store
    console.log('⚠️ Store not found, creating placeholder for:', shop);

    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const storeName = shop.replace('.myshopify.com', '');

    const { data: newStore, error: createError } = await supabase
      .from('stores')
      .insert({
        shop_domain: shop,
        store_name: storeName,
        email: '',
        access_token: '', // Empty - will need proper OAuth to fetch data
        scope: '',
        subscription_status: 'trial',
        trial_ends_at: trialEndsAt,
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Failed to create store:', createError);
      return NextResponse.json({
        error: 'Failed to create store record',
        details: createError.message
      }, { status: 500 });
    }

    console.log('✅ Created placeholder store:', newStore.id);

    // Create default store settings
    await supabase
      .from('store_settings')
      .upsert({
        store_id: newStore.id,
        default_cogs_percentage: 30,
        payment_processing_rate: 0.029,
        payment_processing_fixed: 0.30,
        shopify_fee_rate: 0.02,
      }, {
        onConflict: 'store_id',
      });

    return NextResponse.json({
      store: {
        id: newStore.id,
        store_name: newStore.store_name,
        shop_domain: shop,
        email: '',
        subscription_status: 'trial',
        trial_ends_at: newStore.trial_ends_at,
      },
      created: true
    });

  } catch (error) {
    console.error('❌ Install embedded error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
