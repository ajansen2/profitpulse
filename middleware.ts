import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Add CSP headers for Shopify embedded app iframe
  const response = NextResponse.next();
  response.headers.set(
    'Content-Security-Policy',
    "frame-ancestors https://*.myshopify.com https://admin.shopify.com;"
  );

  // Skip subscription check for auth routes, webhooks, billing callbacks, cron jobs, and static files
  if (
    path.startsWith('/api/auth') ||
    path.startsWith('/api/webhooks') ||
    path.startsWith('/api/billing') ||
    path.startsWith('/api/cron') ||
    path === '/' ||
    path.startsWith('/_next') ||
    path.startsWith('/favicon') ||
    path === '/billing-required' ||
    path === '/privacy' ||
    path === '/terms'
  ) {
    return response;
  }

  // Get shop from query params or headers
  const shop = request.nextUrl.searchParams.get('shop') ||
               request.headers.get('x-shop-domain');

  if (!shop) {
    // No shop context - let the page handle the redirect
    return NextResponse.next();
  }

  // Check subscription status
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: store } = await supabase
      .from('stores')
      .select('id, subscription_status, trial_ends_at')
      .eq('shop_domain', shop)
      .single();

    if (!store) {
      // Store not found - redirect to install
      console.log('Middleware: Store not found for', shop);
      return NextResponse.redirect(new URL('/api/auth/shopify?shop=' + shop, request.url));
    }

    const isActive = store.subscription_status === 'active';
    const isFree = store.subscription_status === 'free' || !store.subscription_status;
    const isTrialValid = store.subscription_status === 'trial' &&
      store.trial_ends_at &&
      new Date(store.trial_ends_at) > new Date();

    if (!isActive && !isFree && !isTrialValid) {
      // Subscription not valid - redirect to billing required page
      console.log('Middleware: Billing required for', shop, '- status:', store.subscription_status);
      const billingUrl = new URL('/billing-required', request.url);
      billingUrl.searchParams.set('shop', shop);
      billingUrl.searchParams.set('store_id', store.id);
      // Preserve host param for App Bridge
      const host = request.nextUrl.searchParams.get('host');
      if (host) {
        billingUrl.searchParams.set('host', host);
      }
      return NextResponse.redirect(billingUrl);
    }

    // Valid subscription - allow access with CSP headers
    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    return response;
  }
}

export const config = {
  matcher: [
    // Match dashboard and API routes that need billing check
    '/dashboard/:path*',
    '/api/products/:path*',
    '/api/orders/:path*',
    '/api/settings/:path*',
  ],
};
