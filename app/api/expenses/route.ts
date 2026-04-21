import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyStoreAccess, getAuthenticatedShop } from '@/lib/verify-session';

/**
 * Get and create custom expenses
 */
export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get('store_id');

  if (!storeId) {
    return NextResponse.json({ error: 'Missing store_id' }, { status: 400 });
  }

  if (!await verifyStoreAccess(request, storeId)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  if (error) {
    // Table might not exist yet, return empty array
    return NextResponse.json({ expenses: [] });
  }

  return NextResponse.json({ expenses: expenses || [] });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { store_id, name, amount, frequency, category } = body;

    if (!store_id || !name || amount === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!await verifyStoreAccess(request, store_id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('expenses')
      .insert({
        store_id,
        name,
        amount: parseFloat(amount),
        frequency: frequency || 'monthly',
        category: category || 'other',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating expense:', error);
      return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
    }

    return NextResponse.json({ expense: data });
  } catch (error) {
    console.error('Create expense error:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const expenseId = request.nextUrl.searchParams.get('id');

  if (!expenseId) {
    return NextResponse.json({ error: 'Missing expense id' }, { status: 400 });
  }

  const shop = getAuthenticatedShop(request);
  if (!shop) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId);

  if (error) {
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
