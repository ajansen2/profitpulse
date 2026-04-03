import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSMS, formatDailyDigestSMS } from '@/lib/twilio';
import { sendSlackDailyDigest, sendDiscordDailyDigest } from '@/lib/webhooks';

/**
 * Test Notifications API
 * Sends test notifications to configured channels (SMS, Slack, Discord)
 *
 * Usage: POST /api/test/notifications
 * Body: { store_id: "xxx", channels: ["sms", "slack", "discord"] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { store_id, channels = ['sms', 'slack', 'discord'] } = body;

    if (!store_id) {
      return NextResponse.json({ error: 'Missing store_id' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get store info
    const { data: store } = await supabase
      .from('stores')
      .select('id, store_name, email')
      .eq('id', store_id)
      .single();

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // Get settings
    const { data: settings } = await supabase
      .from('store_settings')
      .select('sms_enabled, sms_phone_number, slack_webhook_url, discord_webhook_url')
      .eq('store_id', store_id)
      .single();

    const results: { channel: string; status: string; error?: string }[] = [];

    // Sample test data
    const testData = {
      storeName: store.store_name,
      date: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
      orderCount: 5,
      revenue: 1250.00,
      profit: 437.50,
      margin: 35.0,
      prevOrderCount: 3,
      prevProfit: 280.00,
      topProducts: [
        { title: 'Sample Product A', profit: 150.00 },
        { title: 'Sample Product B', profit: 120.00 },
        { title: 'Sample Product C', profit: 95.00 },
      ],
    };

    // Test SMS
    if (channels.includes('sms')) {
      if (settings?.sms_enabled && settings?.sms_phone_number) {
        try {
          const smsBody = formatDailyDigestSMS({
            storeName: testData.storeName,
            date: testData.date,
            orderCount: testData.orderCount,
            revenue: testData.revenue,
            profit: testData.profit,
            margin: testData.margin,
            prevOrderCount: testData.prevOrderCount,
            prevProfit: testData.prevProfit,
            topProduct: testData.topProducts[0]?.title,
            topProductProfit: testData.topProducts[0]?.profit,
          });

          const sent = await sendSMS(settings.sms_phone_number, `🧪 TEST NOTIFICATION\n\n${smsBody}`);
          results.push({ channel: 'sms', status: sent ? 'sent' : 'failed' });
        } catch (err: any) {
          results.push({ channel: 'sms', status: 'error', error: err.message });
        }
      } else {
        results.push({ channel: 'sms', status: 'skipped', error: 'SMS not configured' });
      }
    }

    // Test Slack
    if (channels.includes('slack')) {
      if (settings?.slack_webhook_url) {
        try {
          await sendSlackDailyDigest(settings.slack_webhook_url, {
            ...testData,
            storeName: `🧪 TEST - ${testData.storeName}`,
          });
          results.push({ channel: 'slack', status: 'sent' });
        } catch (err: any) {
          results.push({ channel: 'slack', status: 'error', error: err.message });
        }
      } else {
        results.push({ channel: 'slack', status: 'skipped', error: 'Slack webhook not configured' });
      }
    }

    // Test Discord
    if (channels.includes('discord')) {
      if (settings?.discord_webhook_url) {
        try {
          await sendDiscordDailyDigest(settings.discord_webhook_url, {
            ...testData,
            storeName: `🧪 TEST - ${testData.storeName}`,
          });
          results.push({ channel: 'discord', status: 'sent' });
        } catch (err: any) {
          results.push({ channel: 'discord', status: 'error', error: err.message });
        }
      } else {
        results.push({ channel: 'discord', status: 'skipped', error: 'Discord webhook not configured' });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Test notifications processed',
      results,
    });

  } catch (error: any) {
    console.error('Test notification error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
