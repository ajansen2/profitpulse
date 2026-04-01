import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Shopify Flow / Automation Webhook Triggers
 *
 * This endpoint receives internal events and forwards them to configured
 * automation webhooks (Shopify Flow, Zapier, Make, etc.)
 *
 * Supported triggers:
 * - order.unprofitable: Order has negative profit
 * - order.low_margin: Order below threshold margin
 * - order.high_value: Order profit exceeds threshold
 * - product.losing_money: Product has negative total profit
 */

interface FlowEvent {
  trigger: 'order.unprofitable' | 'order.low_margin' | 'order.high_value' | 'product.losing_money';
  store_id: string;
  data: Record<string, any>;
}

// POST - Send flow trigger event
export async function POST(request: NextRequest) {
  try {
    const event: FlowEvent = await request.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get store settings to find configured webhook URLs
    const { data: settings } = await supabase
      .from('store_settings')
      .select('flow_webhook_url, flow_triggers_enabled')
      .eq('store_id', event.store_id)
      .single();

    if (!settings?.flow_webhook_url || !settings?.flow_triggers_enabled) {
      return NextResponse.json({ success: true, message: 'Flow triggers not configured' });
    }

    // Send webhook to configured URL
    const webhookPayload = {
      event: event.trigger,
      timestamp: new Date().toISOString(),
      store_id: event.store_id,
      data: event.data,
    };

    try {
      await fetch(settings.flow_webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      });
      console.log(`📤 Flow trigger sent: ${event.trigger}`);
    } catch (webhookError) {
      console.error('❌ Failed to send flow webhook:', webhookError);
      // Don't fail the request - webhook delivery is best-effort
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Flow webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// GET - Get flow trigger configuration
export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get('store_id');

  if (!storeId) {
    return NextResponse.json({ error: 'Missing store_id' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: settings } = await supabase
    .from('store_settings')
    .select('flow_webhook_url, flow_triggers_enabled, flow_trigger_types')
    .eq('store_id', storeId)
    .single();

  return NextResponse.json({
    flowWebhookUrl: settings?.flow_webhook_url || '',
    flowTriggersEnabled: settings?.flow_triggers_enabled || false,
    flowTriggerTypes: settings?.flow_trigger_types || ['order.unprofitable'],
  });
}
