// Shopify App Bridge utilities for embedded apps
// Uses the CDN global (window.shopify) for Shopify's automated checks

interface AppBridgeApp {
  dispatch?: (action: {
    type: string;
    payload?: Record<string, unknown>;
  }) => void;
  idToken?: () => Promise<string>;
}

declare global {
  interface Window {
    shopify: {
      createApp(config: {
        apiKey: string;
        host: string;
        forceRedirect?: boolean;
      }): AppBridgeApp;
      config?: {
        shop: string;
        host: string;
      };
    };
    shopifyApp?: AppBridgeApp;
  }
}

let appBridge: AppBridgeApp | null = null;

export function initializeAppBridge() {
  const isEmbedded = window.self !== window.top;

  if (!isEmbedded) {
    return null;
  }

  // Use global instance if it exists
  if (window.shopifyApp && !appBridge) {
    appBridge = window.shopifyApp;
    console.log('✅ Using existing App Bridge instance');
    return appBridge;
  }

  // Get host from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const host = urlParams.get('host');
  const shop = urlParams.get('shop');

  if (!host || !shop) {
    console.warn('Missing host or shop parameter');
    return null;
  }

  if (!appBridge) {
    try {
      if (!window.shopify?.createApp) {
        console.warn('⚠️ Shopify App Bridge CDN not loaded');
        return null;
      }

      appBridge = window.shopify.createApp({
        apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
        host: host,
        forceRedirect: false,
      });

      console.log('✅ App Bridge initialized');
    } catch (error) {
      console.error('❌ Failed to initialize App Bridge:', error);
      return null;
    }
  }

  return appBridge;
}

export function isEmbeddedInShopify(): boolean {
  try {
    return window.self !== window.top;
  } catch (e) {
    // Cross-origin error means we're in an iframe
    return true;
  }
}

export function getShopFromUrl(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('shop') || window.shopify?.config?.shop || null;
}

export function getHostFromUrl(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('host') || null;
}

// Redirect to Shopify admin if app is opened standalone (not embedded)
export function redirectToShopifyAdmin(shop: string): boolean {
  const isEmbedded = window.self !== window.top;
  if (isEmbedded) return false;

  const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;
  const storeName = shop.replace('.myshopify.com', '');
  const adminUrl = `https://admin.shopify.com/store/${storeName}/apps/${apiKey}`;

  console.log('🔄 Redirecting to Shopify admin:', adminUrl);
  window.location.href = adminUrl;
  return true;
}

// Redirect to external URL (like OAuth or billing) - breaks out of iframe
export function redirectToOAuth(url: string) {
  const isEmbedded = window.self !== window.top;

  if (!isEmbedded) {
    window.location.href = url;
    return;
  }

  // Try multiple methods to break out of iframe
  try {
    const opened = window.open(url, '_top');
    if (opened !== null) return;
  } catch (e) {}

  try {
    if (window.parent) {
      window.parent.location.href = url;
      return;
    }
  } catch (e) {}

  try {
    if (window.top) {
      window.top.location.href = url;
      return;
    }
  } catch (e) {}

  window.location.href = url;
}

// Redirect that works both inside and outside iframe
export function redirectToInstall(shop: string) {
  const installUrl = `/api/auth/shopify/install?shop=${encodeURIComponent(shop)}`;

  const isEmbedded = window.self !== window.top;

  if (!isEmbedded) {
    window.location.href = installUrl;
    return;
  }

  // For embedded apps, try to break out of iframe
  try {
    if (window.top) {
      window.top.location.href = installUrl;
      return;
    }
  } catch (e) {
    console.log('Cross-origin redirect blocked, trying alternative...');
  }

  // Fallback
  window.location.href = installUrl;
}
