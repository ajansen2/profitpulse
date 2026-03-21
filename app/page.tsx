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

  useEffect(() => {
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

        // Get shop from URL params
        const urlParams = new URLSearchParams(window.location.search);
        const shopFromUrl = urlParams.get('shop');
        const shopFromBridge = getShopFromUrl();
        const shop = shopFromUrl || shopFromBridge;

        console.log('🏪 Looking up shop:', shop, '(url:', shopFromUrl, 'bridge:', shopFromBridge, ')');

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
        console.log('📡 Fetching store data...');

        // Lookup store in database
        let res;
        try {
          res = await fetch(`/api/stores/lookup?shop=${encodeURIComponent(shop)}`);
        } catch (fetchError) {
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
  }, []);

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
