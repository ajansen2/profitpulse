/**
 * Authenticated fetch wrapper for ProfitPulse API calls.
 *
 * Injects the `x-shop-domain` header on every request so the backend
 * can verify the caller is associated with the correct store.
 *
 * Usage:
 *   import { createAuthenticatedFetch } from '@/lib/authenticated-fetch';
 *   const authFetch = createAuthenticatedFetch(store.shop_domain);
 *   const res = await authFetch('/api/products?store_id=xxx');
 */

export function createAuthenticatedFetch(shopDomain: string) {
  return async function authFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const headers = new Headers(init?.headers);

    // Always inject the shop domain header
    if (!headers.has('x-shop-domain')) {
      headers.set('x-shop-domain', shopDomain);
    }

    // If we're in an embedded Shopify context, try to get a session token too
    if (typeof window !== 'undefined' && (window as any).shopify) {
      try {
        const sessionToken = await (window as any).shopify.idToken();
        if (sessionToken && !headers.has('authorization')) {
          headers.set('Authorization', `Bearer ${sessionToken}`);
        }
      } catch {
        // Not critical — x-shop-domain header is the fallback
      }
    }

    return fetch(input, { ...init, headers });
  };
}
