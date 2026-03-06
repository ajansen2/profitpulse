import { createClient } from '@supabase/supabase-js';

export type SubscriptionStatus = 'active' | 'trial' | 'expired' | 'cancelled' | 'past_due';

export interface SubscriptionCheck {
  valid: boolean;
  status: SubscriptionStatus;
  daysRemaining?: number;
  message?: string;
}

/**
 * Check if a store has a valid subscription (active or within trial period)
 */
export async function checkSubscription(storeId: string): Promise<SubscriptionCheck> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: store, error } = await supabase
    .from('stores')
    .select('subscription_status, trial_ends_at, billing_charge_id')
    .eq('id', storeId)
    .single();

  if (error || !store) {
    return { valid: false, status: 'cancelled', message: 'Store not found' };
  }

  // Active paid subscription
  if (store.subscription_status === 'active') {
    return { valid: true, status: 'active' };
  }

  // Check trial status
  if (store.subscription_status === 'trial' || !store.subscription_status) {
    const trialEndsAt = store.trial_ends_at ? new Date(store.trial_ends_at) : null;
    const now = new Date();

    if (trialEndsAt && trialEndsAt > now) {
      const daysRemaining = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return { valid: true, status: 'trial', daysRemaining };
    }

    return {
      valid: false,
      status: 'expired',
      message: 'Your trial has expired. Please upgrade to continue using ProfitPulse.'
    };
  }

  if (store.subscription_status === 'cancelled') {
    return { valid: false, status: 'cancelled', message: 'Subscription cancelled' };
  }

  return { valid: false, status: 'expired', message: 'Invalid subscription status' };
}

/**
 * Middleware helper - returns error response if subscription is invalid
 */
export async function requireActiveSubscription(storeId: string): Promise<{ error: Response } | { subscription: SubscriptionCheck }> {
  const subscription = await checkSubscription(storeId);

  if (!subscription.valid) {
    return {
      error: new Response(
        JSON.stringify({
          error: 'Subscription required',
          message: subscription.message,
          status: subscription.status
        }),
        { status: 402, headers: { 'Content-Type': 'application/json' } }
      )
    };
  }

  return { subscription };
}
