import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyStoreAccess } from '@/lib/verify-session';

/**
 * Import product costs from CSV data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { store_id, updates } = body;

    if (!store_id || !updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!await verifyStoreAccess(request, store_id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let updated = 0;
    let notFound = 0;

    for (const { sku, cost } of updates) {
      if (!sku || isNaN(cost)) continue;

      // Find product by SKU
      const { data: product } = await supabase
        .from('products')
        .select('id')
        .eq('store_id', store_id)
        .eq('sku', sku)
        .single();

      if (product) {
        const { error: updateError } = await supabase
          .from('products')
          .update({ cost_per_item: cost })
          .eq('id', product.id);

        if (!updateError) {
          updated++;
        }
      } else {
        notFound++;
      }
    }

    return NextResponse.json({
      success: true,
      updated,
      notFound,
      message: `Updated ${updated} products. ${notFound} SKUs not found.`
    });
  } catch (error) {
    console.error('CSV import error:', error);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
