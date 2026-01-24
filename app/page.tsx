'use client';

import { useEffect, useState } from 'react';
import Dashboard from './components/Dashboard';

interface ShopifyConfig {
  config: {
    shop: string;
    host: string;
  };
}

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStore() {
      try {
        // Get shop from App Bridge config or URL params
        const urlParams = new URLSearchParams(window.location.search);
        const shopifyConfig = (window as unknown as { shopify?: ShopifyConfig }).shopify;
        const shop = shopifyConfig?.config?.shop || urlParams.get('shop');

        if (!shop) {
          setError('No shop found. Please open this app from your Shopify admin.');
          setLoading(false);
          return;
        }

        // Lookup store
        const res = await fetch(`/api/stores/lookup?shop=${encodeURIComponent(shop)}`);

        if (!res.ok) {
          if (res.status === 404) {
            // Store not found, redirect to install
            window.location.href = `/api/auth/shopify/install?shop=${encodeURIComponent(shop)}`;
            return;
          }
          throw new Error('Failed to load store');
        }

        const data = await res.json();
        setStore(data.store);
      } catch (err) {
        console.error('Error loading store:', err);
        setError('Failed to load store data');
      } finally {
        setLoading(false);
      }
    }

    loadStore();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading ProfitPulse...</p>
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
