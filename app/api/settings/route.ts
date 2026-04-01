import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Store Settings API
 * Get/update store settings including default COGS and fee rates
 */

// GET - Fetch store settings
export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get('store_id');

  if (!storeId) {
    return NextResponse.json({ error: 'Missing store_id' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get or create settings
  let { data: settings, error } = await supabase
    .from('store_settings')
    .select('*')
    .eq('store_id', storeId)
    .single();

  if (!settings) {
    // Create default settings
    const { data: newSettings, error: createError } = await supabase
      .from('store_settings')
      .insert({
        store_id: storeId,
        default_cogs_percentage: 30,
        default_shipping_cost: 0,
        payment_processing_rate: 0.029,
        payment_processing_fixed: 0.30,
        shopify_plan: 'basic',
        shopify_fee_rate: 0.02,
        include_taxes_in_revenue: false,
        include_shipping_in_revenue: true,
        currency: 'USD',
        email_daily_digest: true,
        email_weekly_summary: true,
        email_profit_alerts: true,
      })
      .select()
      .single();

    if (createError) {
      console.error('Settings create error:', createError);
      return NextResponse.json({ error: 'Failed to create settings' }, { status: 500 });
    }

    settings = newSettings;
  }

  return NextResponse.json({ settings });
}

// POST - Update store settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { store_id, ...updates } = body;

    console.log('📝 [SETTINGS] Saving for store:', store_id);
    console.log('📝 [SETTINGS] Updates received:', JSON.stringify(updates, null, 2));

    if (!store_id) {
      return NextResponse.json({ error: 'Missing store_id' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Only allow updating specific fields
    const allowedFields = [
      'default_cogs_percentage',
      'default_shipping_cost',
      'payment_processing_rate',
      'payment_processing_fixed',
      'shopify_plan',
      'shopify_fee_rate',
      'include_taxes_in_revenue',
      'include_shipping_in_revenue',
      'currency',
      'profit_goal_daily',
      'profit_goal_monthly',
      'notification_email',
      'email_daily_digest',
      'email_weekly_summary',
      'email_profit_alerts',
      'email_alert_threshold',
      'slack_webhook_url',
      'discord_webhook_url',
      'onboarding_completed',
      'dashboard_widgets',
      'flow_webhook_url',
      'flow_triggers_enabled',
      'flow_trigger_types',
    ];

    const sanitizedUpdates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        sanitizedUpdates[field] = updates[field];
      }
    }

    sanitizedUpdates.updated_at = new Date().toISOString();

    console.log('📝 [SETTINGS] Sanitized updates:', JSON.stringify(sanitizedUpdates, null, 2));

    const { data: settings, error } = await supabase
      .from('store_settings')
      .update(sanitizedUpdates)
      .eq('store_id', store_id)
      .select()
      .single();

    if (error) {
      console.error('❌ [SETTINGS] Update error:', error);
      return NextResponse.json({ error: 'Failed to update settings', details: error.message }, { status: 500 });
    }

    console.log('✅ [SETTINGS] Saved successfully:', JSON.stringify(settings, null, 2));

    return NextResponse.json({ settings, success: true });
  } catch (error) {
    console.error('❌ [SETTINGS] POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
