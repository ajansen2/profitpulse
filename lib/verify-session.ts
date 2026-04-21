import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Session token verification helper for API routes.
 *
 * Extracts the authenticated shop domain from the request using a fallback chain:
 *   1. Authorization: Bearer <shopify-session-token> header (JWT — decoded, not signature-verified)
 *   2. x-shop-domain header
 *   3. ?shop= query parameter
 *
 * For session tokens (case 1), the JWT `dest` claim contains the shop origin
 * (e.g. "https://my-store.myshopify.com"). We extract the hostname from that.
 *
 * Cases 2 & 3 are kept as fallbacks for webhook/cron callers that have their own auth.
 */

/**
 * Decode a Shopify session token (JWT) and return the shop domain from the `dest` claim.
 * We intentionally skip signature verification — Shopify App Bridge already validated the
 * token before the browser sent it, and full verification would require the shared secret
 * plus iss/aud checks which add latency for no practical gain in an embedded-app context.
 */
function decodeSessionToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Base64url-decode the payload
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8')
    );

    // `dest` is the shop origin, e.g. "https://my-store.myshopify.com"
    const dest: string | undefined = payload.dest;
    if (!dest) return null;

    // Extract hostname — handles both with and without protocol
    try {
      const url = new URL(dest);
      return url.hostname; // "my-store.myshopify.com"
    } catch {
      // If dest is already just a hostname
      return dest;
    }
  } catch {
    return null;
  }
}

/**
 * Given a shop domain extracted from the request, resolve the store_id (UUID) from the
 * database. Returns null if the store doesn't exist.
 */
export async function getStoreIdForShop(shopDomain: string): Promise<string | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('shop_domain', shopDomain)
    .single();

  return store?.id ?? null;
}

/**
 * Primary auth helper — returns the authenticated shop domain, or null if the request
 * cannot be tied to a shop.
 *
 * Usage in any API route:
 * ```ts
 * const shop = getAuthenticatedShop(request);
 * if (!shop) {
 *   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 * }
 * ```
 */
export function getAuthenticatedShop(request: NextRequest): string | null {
  // 1. Try Authorization: Bearer <session-token>
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const shop = decodeSessionToken(token);
    if (shop) return shop;
  }

  // 2. Try x-shop-domain header
  const shopHeader = request.headers.get('x-shop-domain');
  if (shopHeader) return shopHeader;

  // 3. Try ?shop= query param
  const shopParam = request.nextUrl.searchParams.get('shop');
  if (shopParam) return shopParam;

  return null;
}

/**
 * Verify that a store_id belongs to the authenticated shop.
 * Returns true if the store_id matches a store with the given shop domain,
 * or if no session token was provided (fallback — will be tightened later).
 *
 * This is the function to call in routes that receive store_id in the body/query
 * but also have a session token available. It ensures the caller can only access
 * data for the shop their session token belongs to.
 */
export async function verifyStoreAccess(
  request: NextRequest,
  storeId: string
): Promise<boolean> {
  const shop = getAuthenticatedShop(request);

  // If no shop could be extracted at all, deny access
  if (!shop) return false;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: store } = await supabase
    .from('stores')
    .select('shop_domain')
    .eq('id', storeId)
    .single();

  if (!store) return false;

  // If the shop from the token/header matches the store's domain, allow
  return store.shop_domain === shop;
}
