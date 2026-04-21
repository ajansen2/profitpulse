import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyStoreAccess } from '@/lib/verify-session';

/**
 * Bulk update product costs
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { store_id, type, value } = body;

    if (!store_id || !type || value === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!await verifyStoreAccess(request, store_id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get all products for this store
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, shopify_variant_id, price')
      .eq('store_id', store_id);

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }

    // Update each product
    let updated = 0;
    for (const product of products || []) {
      let newCost = 0;

      if (type === 'percentage') {
        // Calculate cost as percentage of price
        newCost = (product.price || 0) * (value / 100);
      } else if (type === 'fixed') {
        // Set fixed cost
        newCost = value;
      }

      const { error: updateError } = await supabase
        .from('products')
        .update({ cost_per_item: newCost })
        .eq('id', product.id);

      if (!updateError) {
        updated++;
      }
    }

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error('Bulk update error:', error);
    return NextResponse.json({ error: 'Bulk update failed' }, { status: 500 });
  }
}
