import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Push Notification Subscription API
 * Stores push subscription for sending notifications
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { store_id, subscription } = body;

    if (!store_id || !subscription) {
      return NextResponse.json({ error: 'Missing store_id or subscription' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Upsert the push subscription
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        store_id,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'store_id,endpoint',
      });

    if (error) {
      console.error('Push subscription error:', error);
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Push subscribe error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { store_id, endpoint } = body;

    if (!store_id || !endpoint) {
      return NextResponse.json({ error: 'Missing store_id or endpoint' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('store_id', store_id)
      .eq('endpoint', endpoint);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
