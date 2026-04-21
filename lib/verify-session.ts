import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

/**
 * Session token verification helper for API routes.
 *
 * Extracts the authenticated shop domain from the request:
 *   1. Authorization: Bearer <shopify-session-token> — JWT verified with HMAC-SHA256
 *   2. x-shop-domain header — ONLY accepted for internal callers (webhooks/cron)
 *   3. ?shop= query param — ONLY accepted for internal callers (webhooks/cron)
 *
 * The JWT `dest` claim contains the shop origin (e.g. "https://my-store.myshopify.com").
 */

/**
 * Verify and decode a Shopify session token (JWT).
 * Validates the HMAC-SHA256 signature using the app's API secret.
 * Returns the shop domain from the `dest` claim, or null if invalid.
 */
function verifyAndDecodeSessionToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const secret = process.env.SHOPIFY_API_SECRET;
    if (!secret) {
      console.error('SHOPIFY_API_SECRET not set — cannot verify session tokens');
      return null;
    }

    // Verify HMAC-SHA256 signature
    const signatureInput = `${parts[0]}.${parts[1]}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signatureInput)
      .digest('base64url');

    if (expectedSignature !== parts[2]) {
      console.warn('Session token signature mismatch — rejecting');
      return null;
    }

    // Decode payload
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8')
    );

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      console.warn('Session token expired');
      return null;
    }

    // Extract shop from `dest` claim
    const dest: string | undefined = payload.dest;
    if (!dest) return null;

    try {
      const url = new URL(dest);
      return url.hostname; // "my-store.myshopify.com"
    } catch {
      return dest;
    }
  } catch {
    return null;
  }
}

/**
 * Given a shop domain, resolve the store_id (UUID) from the database.
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
 * Primary auth helper — returns the authenticated shop domain from a verified
 * session token. Falls back to header/query param ONLY if allowUnsigned is true
 * (for webhook/cron routes that have their own auth).
 *
 * Usage in API routes:
 * ```ts
 * const shop = getAuthenticatedShop(request);
 * if (!shop) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 * ```
 */
export function getAuthenticatedShop(request: NextRequest, allowUnsigned = false): string | null {
  // 1. Try Authorization: Bearer <session-token> — signature verified
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const shop = verifyAndDecodeSessionToken(token);
    if (shop) return shop;
  }

  // Only allow unsigned fallbacks for internal callers (webhooks, cron)
  if (!allowUnsigned) return null;

  // 2. Try x-shop-domain header (internal only)
  const shopHeader = request.headers.get('x-shop-domain');
  if (shopHeader) return shopHeader;

  // 3. Try ?shop= query param (internal only)
  const shopParam = request.nextUrl.searchParams.get('shop');
  if (shopParam) return shopParam;

  return null;
}

/**
 * Verify that a store_id belongs to the authenticated shop.
 */
export async function verifyStoreAccess(
  request: NextRequest,
  storeId: string
): Promise<boolean> {
  const shop = getAuthenticatedShop(request);
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
  return store.shop_domain === shop;
}
