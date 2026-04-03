import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

/**
 * Share Links API
 * Create and manage read-only dashboard sharing links
 */

// GET - List all share links for a store
export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get('store_id');

  if (!storeId) {
    return NextResponse.json({ error: 'Missing store_id' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: links, error } = await supabase
    .from('share_links')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 });
  }

  // Add full URL to each link
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://profitpulse.app';
  const linksWithUrl = links?.map(link => ({
    ...link,
    url: `${baseUrl}/shared/${link.token}`,
  }));

  return NextResponse.json({ links: linksWithUrl });
}

// POST - Create a new share link
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { store_id, name, permissions, expires_in_days } = body;

    if (!store_id) {
      return NextResponse.json({ error: 'Missing store_id' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Generate a secure random token
    const token = randomBytes(32).toString('hex');

    // Calculate expiration
    let expiresAt = null;
    if (expires_in_days) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + expires_in_days);
      expiresAt = expDate.toISOString();
    }

    const { data: link, error } = await supabase
      .from('share_links')
      .insert({
        store_id,
        token,
        name: name || 'Shared Dashboard',
        permissions: permissions || {
          viewDashboard: true,
          viewProducts: false,
          viewOrders: false,
        },
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) {
      console.error('Create share link error:', error);
      return NextResponse.json({ error: 'Failed to create link' }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://profitpulse.app';

    return NextResponse.json({
      link: {
        ...link,
        url: `${baseUrl}/shared/${link.token}`,
      },
    });
  } catch (error) {
    console.error('Share link POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE - Revoke a share link
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { store_id, link_id } = body;

    if (!store_id || !link_id) {
      return NextResponse.json({ error: 'Missing store_id or link_id' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase
      .from('share_links')
      .delete()
      .eq('id', link_id)
      .eq('store_id', store_id);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete link' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
