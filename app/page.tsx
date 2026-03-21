'use client';

import { useEffect, useState } from 'react';
import Dashboard from './components/Dashboard';
import { initializeAppBridge, isEmbeddedInShopify, getShopFromUrl } from '@/lib/shopify-app-bridge';

interface Store {
  id: string;
  store_name: string;
  shop_domain: string;
  subscription_status: string;
  trial_ends_at: string | null;
}

export default function Home() {
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Ensure client-side only
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    async function loadStore() {
      try {
        console.log('🚀 Page loading, URL:', window.location.href);

        // Initialize App Bridge if embedded
        if (isEmbeddedInShopify()) {
          setLoadingMessage('Connecting to Shopify...');
          try {
            initializeAppBridge();
          } catch (e) {
            console.warn('App Bridge init error (non-fatal):', e);
          }
        }

        // Get shop and id_token from URL params
        const urlParams = new URLSearchParams(window.location.search);
        const shopFromUrl = urlParams.get('shop');
        const shopFromBridge = getShopFromUrl();
        const shop = shopFromUrl || shopFromBridge;
        const idToken = urlParams.get('id_token');

        console.log('🏪 Looking up shop:', shop, '(url:', shopFromUrl, 'bridge:', shopFromBridge, ')');
        console.log('🔑 ID token present:', !!idToken);

        // If we have an id_token, try to exchange it for access token
        if (shop && idToken) {
          console.log('🔄 Attempting token exchange...');
          try {
            const tokenRes = await fetch('/api/auth/shopify/token-from-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ shop, session_token: idToken }),
            });
            const tokenData = await tokenRes.json();
            console.log('🔄 Token exchange result:', tokenData);
          } catch (e) {
            console.warn('Token exchange failed (non-fatal):', e);
          }
        }

        if (!shop) {
          // Not embedded and no shop param - show landing page or error
          if (!isEmbeddedInShopify()) {
            setError('Please open this app from your Shopify admin.');
          } else {
            setError('No shop found. Please reinstall the app.');
          }
          setLoading(false);
          return;
        }

        setLoadingMessage('Loading store data...');
        const apiUrl = `/api/stores/lookup?shop=${encodeURIComponent(shop)}`;
        console.log('📡 Fetching store data from:', apiUrl);

        // Lookup store in database with timeout
        let res;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            console.error('⏱️ Fetch timeout after 10 seconds');
            controller.abort();
          }, 10000);

          res = await fetch(apiUrl, { signal: controller.signal });
          clearTimeout(timeoutId);
          console.log('📡 Fetch completed with status:', res.status);
        } catch (fetchError: unknown) {
          if (fetchError instanceof Error && fetchError.name === 'AbortError') {
            console.error('❌ Fetch aborted due to timeout');
            setError('Request timed out. Please refresh the page.');
            setLoading(false);
            return;
          }
          console.error('❌ Fetch error:', fetchError);
          throw fetchError;
        }

        console.log('📡 Store lookup response:', res.status);

        if (!res.ok) {
          if (res.status === 404) {
            // Store not found - try fallback install-embedded endpoint
            console.log('⚠️ Store not found, trying install-embedded fallback...');
            setLoadingMessage('Setting up your store...');

            const fallbackRes = await fetch('/api/auth/shopify/install-embedded', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ shop }),
            });

            if (fallbackRes.ok) {
              const fallbackData = await fallbackRes.json();
              console.log('✅ Store created via fallback:', fallbackData.store?.id);
              setStore(fallbackData.store);
              setLoading(false);
              return;
            }

            console.log('❌ Fallback also failed');
            setError('Store not found. Please reinstall the app from the Shopify App Store.');
            setLoading(false);
            return;
          }
          throw new Error('Failed to load store');
        }

        const data = await res.json();
        console.log('✅ Store loaded:', data.store?.id);
        setStore(data.store);
      } catch (err) {
        console.error('Error loading store:', err);
        setError('Failed to load store data. Please try refreshing.');
      } finally {
        setLoading(false);
      }
    }

    loadStore();
  }, [mounted]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!store) {
    return null;
  }

  return <Dashboard store={store} />;
}
