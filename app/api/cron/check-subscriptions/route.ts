import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Cron Job: Check Subscription Status & Handle Expired Trials
 * Run daily at midnight: 0 0 * * *
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const now = new Date();
    const results = {
      expired_trials: 0,
      charges_created: 0,
      reminders_sent: 0,
      errors: [] as string[],
    };

    // Find stores with expired trials
    const { data: expiredTrials, error } = await supabase
      .from('stores')
      .select('*')
      .eq('subscription_status', 'trial')
      .lt('trial_ends_at', now.toISOString())
      .not('access_token', 'is', null);

    if (error) {
      console.error('Error fetching expired trials:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    for (const store of expiredTrials || []) {
      try {
        console.log(`[Subscription] Processing ${store.shop_domain}`);

        // Check existing charge status
        const chargeStatus = await checkExistingCharge(store);

        if (chargeStatus === 'active') {
          await supabase
            .from('stores')
            .update({ subscription_status: 'active', updated_at: now.toISOString() })
            .eq('id', store.id);
          continue;
        }

        if (chargeStatus === 'pending') {
          await sendBillingReminder(store, 'pending');
          results.reminders_sent++;
          continue;
        }

        // Create new charge
        const chargeCreated = await createBillingCharge(store);
        if (chargeCreated) results.charges_created++;

        // Mark as expired
        await supabase
          .from('stores')
          .update({ subscription_status: 'expired', updated_at: now.toISOString() })
          .eq('id', store.id);

        results.expired_trials++;
        await sendBillingReminder(store, 'expired');
        results.reminders_sent++;

      } catch (err: any) {
        console.error(`Error processing ${store.shop_domain}:`, err);
        results.errors.push(`${store.shop_domain}: ${err.message}`);
      }
    }

    // Send reminders for trials expiring in 3 days
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const { data: expiringTrials } = await supabase
      .from('stores')
      .select('*')
      .eq('subscription_status', 'trial')
      .gt('trial_ends_at', now.toISOString())
      .lt('trial_ends_at', threeDaysFromNow.toISOString())
      .is('trial_reminder_sent', null);

    for (const store of expiringTrials || []) {
      try {
        await sendBillingReminder(store, 'expiring_soon');
        await supabase
          .from('stores')
          .update({ trial_reminder_sent: now.toISOString() })
          .eq('id', store.id);
        results.reminders_sent++;
      } catch (err) {
        console.error(`Error sending reminder to ${store.shop_domain}`);
      }
    }

    return NextResponse.json({ success: true, ...results });
  } catch (error: any) {
    console.error('[Subscription] Cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function checkExistingCharge(store: any): Promise<'active' | 'pending' | 'none'> {
  try {
    const response = await fetch(
      `https://${store.shop_domain}/admin/api/2024-01/recurring_application_charges.json`,
      { headers: { 'X-Shopify-Access-Token': store.access_token } }
    );

    if (!response.ok) return 'none';

    const data = await response.json();
    const charges = data.recurring_application_charges || [];

    if (charges.find((c: any) => c.status === 'active')) return 'active';
    if (charges.find((c: any) => c.status === 'pending')) return 'pending';

    return 'none';
  } catch {
    return 'none';
  }
}

async function createBillingCharge(store: any): Promise<boolean> {
  try {
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const isTestStore = store.shop_domain.includes('-test') || store.shop_domain.includes('development');
    const shopName = store.shop_domain.replace('.myshopify.com', '');
    const returnUrl = `https://admin.shopify.com/store/${shopName}/apps/${clientId}`;

    const response = await fetch(
      `https://${store.shop_domain}/admin/api/2024-01/recurring_application_charges.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': store.access_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recurring_application_charge: {
            name: 'ProfitPulse - Pro Plan',
            price: 99.00,
            return_url: returnUrl,
            ...(isTestStore && { test: true }),
          }
        })
      }
    );

    return response.ok;
  } catch {
    return false;
  }
}

async function sendBillingReminder(store: any, type: string): Promise<void> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    await fetch(`${appUrl}/api/emails/trial-reminder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: store.email,
        shop: store.shop_domain,
        type,
      }),
    });
  } catch (error) {
    console.error('Error sending reminder:', error);
  }
}
