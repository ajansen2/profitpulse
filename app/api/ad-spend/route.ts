import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Get and create ad spend entries
 */
export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get('store_id');
  const days = request.nextUrl.searchParams.get('days') || '30';

  if (!storeId) {
    return NextResponse.json({ error: 'Missing store_id' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));

  const { data: adSpend, error } = await supabase
    .from('ad_spend')
    .select('*')
    .eq('store_id', storeId)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: false });

  if (error) {
    // Table might not exist yet
    return NextResponse.json({ adSpend: [], summary: { total: 0, byPlatform: {} } });
  }

  // Calculate summary
  const total = adSpend?.reduce((sum, a) => sum + (a.spend || 0), 0) || 0;
  const byPlatform: Record<string, number> = {};
  for (const entry of adSpend || []) {
    byPlatform[entry.platform] = (byPlatform[entry.platform] || 0) + entry.spend;
  }

  return NextResponse.json({
    adSpend: adSpend || [],
    summary: { total, byPlatform }
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { store_id, platform, spend, date, campaign_name } = body;

    if (!store_id || !platform || spend === undefined || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Upsert - update if same store/platform/date exists
    const { data, error } = await supabase
      .from('ad_spend')
      .upsert({
        store_id,
        platform,
        spend: parseFloat(spend),
        date,
        campaign_name: campaign_name || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'store_id,platform,date'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating ad spend:', error);
      return NextResponse.json({ error: 'Failed to create ad spend entry' }, { status: 500 });
    }

    return NextResponse.json({ adSpend: data });
  } catch (error) {
    console.error('Create ad spend error:', error);
    return NextResponse.json({ error: 'Failed to create ad spend entry' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase
    .from('ad_spend')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
