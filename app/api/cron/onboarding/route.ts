import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  welcomeEmail,
  addProductCostsEmail,
  setProfitGoalEmail,
  tryForecastingEmail,
  trialEndingEmail,
  sendOnboardingEmail,
} from '@/lib/onboarding-emails';

/**
 * Cron: Onboarding email sequence
 * Runs every 6 hours. Checks each store's install date and sends
 * the appropriate email in the sequence.
 *
 * Schedule (days since install):
 *   0: Welcome
 *   1: Add product costs (COGS)
 *   3: Set a profit goal
 *   5: Try AI forecasting
 *   6: Trial ending tomorrow
 *
 * Tracks progress in `onboarding_emails_sent` column (integer)
 * on the stores table.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get all stores that haven't completed onboarding
  const { data: stores, error } = await supabase
    .from('stores')
    .select('id, shop_domain, store_name, email, created_at, onboarding_emails_sent, subscription_status')
    .lt('onboarding_emails_sent', 5)  // 5 emails total in sequence
    .not('email', 'is', null);

  if (error) {
    console.error('Onboarding cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!stores || stores.length === 0) {
    return NextResponse.json({ message: 'No stores need onboarding emails', sent: 0 });
  }

  const now = new Date();
  let totalSent = 0;
  const results: any[] = [];

  for (const store of stores) {
    const installDate = new Date(store.created_at);
    const daysSinceInstall = Math.floor((now.getTime() - installDate.getTime()) / (1000 * 60 * 60 * 24));
    const emailsSent = store.onboarding_emails_sent || 0;
    const storeName = store.store_name || store.shop_domain?.replace('.myshopify.com', '') || 'there';
    const shopDomain = store.shop_domain || '';

    // Skip if already subscribed (active) — they don't need trial-ending email
    const isActive = store.subscription_status === 'active';

    let emailToSend: { subject: string; html: string } | null = null;
    let nextEmailNum = emailsSent + 1;

    // Determine which email to send based on days and progress
    if (emailsSent === 0 && daysSinceInstall >= 0) {
      emailToSend = welcomeEmail(storeName, shopDomain);
    } else if (emailsSent === 1 && daysSinceInstall >= 1) {
      emailToSend = addProductCostsEmail(storeName, shopDomain);
    } else if (emailsSent === 2 && daysSinceInstall >= 3) {
      emailToSend = setProfitGoalEmail(storeName, shopDomain);
    } else if (emailsSent === 3 && daysSinceInstall >= 5) {
      emailToSend = tryForecastingEmail(storeName, shopDomain);
    } else if (emailsSent === 4 && daysSinceInstall >= 6 && !isActive) {
      emailToSend = trialEndingEmail(storeName, shopDomain);
    } else if (emailsSent === 4 && isActive) {
      // Already subscribed, skip trial ending email, mark complete
      await supabase
        .from('stores')
        .update({ onboarding_emails_sent: 5 })
        .eq('id', store.id);
      continue;
    }

    if (emailToSend && store.email) {
      const result = await sendOnboardingEmail(store.email, emailToSend);

      if (result.success) {
        await supabase
          .from('stores')
          .update({ onboarding_emails_sent: nextEmailNum })
          .eq('id', store.id);

        totalSent++;
        results.push({
          store: store.shop_domain,
          email: nextEmailNum,
          subject: emailToSend.subject,
          status: 'sent',
        });
        console.log(`Onboarding email #${nextEmailNum} sent to ${store.email} (${store.shop_domain})`);
      } else {
        results.push({
          store: store.shop_domain,
          email: nextEmailNum,
          status: 'failed',
          error: result.error,
        });
        console.error(`Onboarding email #${nextEmailNum} failed for ${store.shop_domain}:`, result.error);
      }
    }
  }

  return NextResponse.json({
    message: `Onboarding emails processed`,
    sent: totalSent,
    storesChecked: stores.length,
    results,
  });
}
