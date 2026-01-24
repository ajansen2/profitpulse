'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface Store {
  id: string;
  store_name: string;
  shop_domain: string;
  subscription_status: string;
  trial_ends_at: string | null;
}

interface Summary {
  totalOrders: number;
  totalRevenue: number;
  totalCogs: number;
  totalGrossProfit: number;
  totalNetProfit: number;
  totalFees: number;
  avgProfitMargin: number;
  avgOrderValue: number;
  avgProfitPerOrder: number;
  totalAdSpend: number;
  roas: number;
  profitAfterAds: number;
}

interface ChartData {
  date: string;
  revenue: number;
  profit: number;
  orders: number;
  cogs: number;
}

interface TopProduct {
  title: string;
  profit: number;
  revenue: number;
  quantity: number;
}

interface AnalyticsData {
  summary: Summary;
  chartData: ChartData[];
  topProducts: TopProduct[];
  recentOrders: any[];
}

export default function Dashboard({ store }: { store: Store }) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(30);

  useEffect(() => {
    async function loadAnalytics() {
      setLoading(true);
      try {
        const res = await fetch(`/api/analytics/summary?store_id=${store.id}&days=${dateRange}`);
        const data = await res.json();
        setAnalytics(data);
      } catch (err) {
        console.error('Error loading analytics:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, [store.id, dateRange]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading || !analytics) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="skeleton h-8 w-48 mb-2"></div>
            <div className="skeleton h-4 w-64"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="stat-card">
                <div className="skeleton h-6 w-24 mb-2"></div>
                <div className="skeleton h-8 w-32"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const { summary, chartData, topProducts } = analytics;

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Profit Dashboard</h1>
            <p className="text-gray-500">{store.store_name || store.shop_domain}</p>
          </div>
          <div className="flex gap-2">
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                onClick={() => setDateRange(days)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateRange === days
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {days}D
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="stat-card">
            <p className="stat-label">Total Revenue</p>
            <p className="stat-value">{formatCurrency(summary.totalRevenue)}</p>
            <p className="text-sm text-gray-500 mt-1">{summary.totalOrders} orders</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Total COGS</p>
            <p className="stat-value text-red-600">{formatCurrency(summary.totalCogs)}</p>
            <p className="text-sm text-gray-500 mt-1">
              {summary.totalRevenue > 0 ? formatPercent((summary.totalCogs / summary.totalRevenue) * 100) : '0%'} of revenue
            </p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Net Profit</p>
            <p className={`stat-value ${summary.totalNetProfit >= 0 ? 'profit-positive' : 'profit-negative'}`}>
              {formatCurrency(summary.totalNetProfit)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {formatPercent(summary.avgProfitMargin)} margin
            </p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Profit After Ads</p>
            <p className={`stat-value ${summary.profitAfterAds >= 0 ? 'profit-positive' : 'profit-negative'}`}>
              {formatCurrency(summary.profitAfterAds)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {summary.totalAdSpend > 0 ? `${summary.roas.toFixed(2)}x ROAS` : 'No ad spend'}
            </p>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="stat-card">
            <p className="stat-label">Avg Order Value</p>
            <p className="text-xl font-semibold">{formatCurrency(summary.avgOrderValue)}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Avg Profit/Order</p>
            <p className={`text-xl font-semibold ${summary.avgProfitPerOrder >= 0 ? 'profit-positive' : 'profit-negative'}`}>
              {formatCurrency(summary.avgProfitPerOrder)}
            </p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Total Fees</p>
            <p className="text-xl font-semibold text-orange-600">{formatCurrency(summary.totalFees)}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Ad Spend</p>
            <p className="text-xl font-semibold">{formatCurrency(summary.totalAdSpend)}</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue vs Profit Chart */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Revenue vs Profit</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    formatter={(value) => formatCurrency(value as number)}
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    name="Revenue"
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                    name="Net Profit"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Products */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Top Products by Profit</h2>
            <div className="space-y-3">
              {topProducts.slice(0, 5).map((product, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{product.title}</p>
                    <p className="text-xs text-gray-500">{product.quantity} sold</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className={`text-sm font-semibold ${product.profit >= 0 ? 'profit-positive' : 'profit-negative'}`}>
                      {formatCurrency(product.profit)}
                    </p>
                    <p className="text-xs text-gray-500">{formatCurrency(product.revenue)} rev</p>
                  </div>
                </div>
              ))}
              {topProducts.length === 0 && (
                <p className="text-gray-500 text-center py-4">No product data yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Subscription Status Banner */}
        {store.subscription_status === 'trial' && store.trial_ends_at && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-amber-800">Free Trial Active</p>
                <p className="text-sm text-amber-600">
                  Trial ends {new Date(store.trial_ends_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => {
                  fetch(`/api/billing/create?store_id=${store.id}`)
                    .then(res => res.json())
                    .then(data => {
                      if (data.confirmation_url) {
                        window.open(data.confirmation_url, '_top');
                      }
                    });
                }}
                className="btn-primary"
              >
                Upgrade Now
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
