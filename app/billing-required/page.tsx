'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { initializeAppBridge, redirectToOAuth, isEmbeddedInShopify, redirectToShopifyAdmin } from '@/lib/shopify-app-bridge';

function BillingRequiredContent() {
  const searchParams = useSearchParams();
  const shop = searchParams.get('shop');
  const storeId = searchParams.get('store_id');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If opened standalone with shop param, redirect to Shopify admin
    if (shop && !isEmbeddedInShopify()) {
      redirectToShopifyAdmin(shop);
      return;
    }

    if (isEmbeddedInShopify()) {
      initializeAppBridge();
    }
  }, [shop]);

  const handleSubscribe = async () => {
    if (!shop || !storeId) {
      setError('Missing shop information. Please reinstall the app.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/billing/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop, storeId }),
      });

      const data = await response.json();

      if (data.confirmationUrl) {
        redirectToOAuth(data.confirmationUrl);
      } else if (data.status === 'active') {
        const host = searchParams.get('host');
        window.location.href = `/dashboard?shop=${shop}${host ? `&host=${host}` : ''}`;
      } else if (data.needsOAuth) {
        redirectToOAuth(`/api/auth/shopify?shop=${shop}`);
      } else {
        setError(data.error || 'Failed to create subscription. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Subscription error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="text-center p-8 max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl">
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white mb-4">Subscription Required</h1>
        <p className="text-zinc-400 mb-6">
          Your free trial has ended. Subscribe to continue using ProfitPulse Pro.
        </p>
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 mb-6">
          <p className="text-3xl font-bold text-white">$29.99</p>
          <p className="text-zinc-500">per month</p>
        </div>
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg text-sm">
            {error}
          </div>
        )}
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Loading...
            </span>
          ) : (
            'Subscribe Now'
          )}
        </button>
        <p className="mt-4 text-sm text-zinc-500">
          Cancel anytime from your Shopify admin
        </p>
      </div>
    </div>
  );
}

export default function BillingRequiredPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <BillingRequiredContent />
    </Suspense>
  );
}
