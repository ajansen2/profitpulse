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
        apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || '8d2e3d5d49c8c9253a5781ae3e8a02da',
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
  return window.self !== window.top;
}

export function getShopFromUrl(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('shop') || window.shopify?.config?.shop || null;
}

export function getHostFromUrl(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('host') || null;
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
