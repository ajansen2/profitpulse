'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface SharedData {
  storeName: string;
  sharedBy: string;
  summary: {
    totalRevenue: number;
    totalNetProfit: number;
    totalOrders: number;
    avgProfitMargin: number;
  };
  chartData: { date: string; revenue: number; profit: number }[];
  topProducts: { title: string; profit: number; revenue: number }[];
}

export default function SharedDashboard() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<SharedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSharedData() {
      try {
        const res = await fetch(`/api/share/view?token=${token}`);
        const result = await res.json();

        if (!res.ok) {
          setError(result.error || 'Failed to load shared dashboard');
          return;
        }

        setData(result);
      } catch (err) {
        setError('Failed to load shared dashboard');
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchSharedData();
    }
  }, [token]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-solid border-emerald-500 border-r-transparent mb-4"></div>
          <p className="text-white/60">Loading shared dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Link Expired or Invalid</h1>
          <p className="text-white/60">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{data.storeName}</h1>
            <p className="text-white/60 text-sm">Shared by {data.sharedBy}</p>
          </div>
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Read-only view
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="text-white/50 text-sm mb-1">Revenue</div>
            <div className="text-2xl font-bold text-white">{formatCurrency(data.summary.totalRevenue)}</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="text-white/50 text-sm mb-1">Net Profit</div>
            <div className="text-2xl font-bold text-emerald-400">{formatCurrency(data.summary.totalNetProfit)}</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="text-white/50 text-sm mb-1">Orders</div>
            <div className="text-2xl font-bold text-white">{data.summary.totalOrders}</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="text-white/50 text-sm mb-1">Profit Margin</div>
            <div className="text-2xl font-bold text-white">{data.summary.avgProfitMargin.toFixed(1)}%</div>
          </div>
        </div>

        {/* Top Products */}
        {data.topProducts.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-bold text-white mb-4">Top Products by Profit</h2>
            <div className="space-y-3">
              {data.topProducts.slice(0, 5).map((product, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 text-xs font-bold">
                      {i + 1}
                    </span>
                    <span className="text-white">{product.title}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-emerald-400 font-medium">{formatCurrency(product.profit)}</div>
                    <div className="text-white/40 text-xs">{formatCurrency(product.revenue)} revenue</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-white/40 text-sm">
          <p>Powered by ProfitPulse</p>
        </div>
      </main>
    </div>
  );
}
