'use client';

import { useEffect, useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import Link from 'next/link';
import Image from 'next/image';
import ProductsPage from './ProductsPage';
import OrdersPage from './OrdersPage';
import SettingsPage from './SettingsPage';
import AIProfitCoach from './AIProfitCoach';

interface Store {
  id: string;
  store_name: string;
  shop_domain: string;
  email?: string;
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
  margin: number;
}

interface RecentOrder {
  id: string;
  order_number: string;
  total_price: number;
  net_profit: number;
  profit_margin: number;
  created_at: string;
}

interface Comparison {
  revenueChange: number;
  profitChange: number;
  ordersChange: number;
  aovChange: number;
  prevTotalRevenue: number;
  prevTotalNetProfit: number;
  prevTotalOrders: number;
}

interface AnalyticsData {
  summary: Summary;
  comparison: Comparison;
  chartData: ChartData[];
  topProducts: TopProduct[];
  recentOrders: RecentOrder[];
}

type DateRangeOption = '7d' | '14d' | '30d' | '90d';

export default function Dashboard({ store }: { store: Store }) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRangeOption, setDateRangeOption] = useState<DateRangeOption>('30d');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activePage, setActivePage] = useState('dashboard');

  const dateRange = useMemo(() => {
    const days = dateRangeOption === '7d' ? 7 : dateRangeOption === '14d' ? 14 : dateRangeOption === '30d' ? 30 : 90;
    return { days, label: `Last ${days} days` };
  }, [dateRangeOption]);

  useEffect(() => {
    async function loadAnalytics() {
      setLoading(true);
      try {
        const res = await fetch(`/api/analytics/summary?store_id=${store.id}&days=${dateRange.days}`);

        if (!res.ok) {
          console.warn('Analytics API returned:', res.status);
          // Set empty analytics on error
          setAnalytics({
            summary: {
              totalOrders: 0,
              totalRevenue: 0,
              totalCogs: 0,
              totalGrossProfit: 0,
              totalNetProfit: 0,
              totalFees: 0,
              avgProfitMargin: 0,
              avgOrderValue: 0,
              avgProfitPerOrder: 0,
              totalAdSpend: 0,
              roas: 0,
              profitAfterAds: 0,
            },
            comparison: {
              revenueChange: 0,
              profitChange: 0,
              ordersChange: 0,
              aovChange: 0,
              prevTotalRevenue: 0,
              prevTotalNetProfit: 0,
              prevTotalOrders: 0,
            },
            chartData: [],
            topProducts: [],
            recentOrders: [],
          });
          return;
        }

        const data = await res.json();
        setAnalytics(data);
      } catch (err) {
        console.error('Error loading analytics:', err);
        // Set empty analytics on error
        setAnalytics({
          summary: {
            totalOrders: 0,
            totalRevenue: 0,
            totalCogs: 0,
            totalGrossProfit: 0,
            totalNetProfit: 0,
            totalFees: 0,
            avgProfitMargin: 0,
            avgOrderValue: 0,
            avgProfitPerOrder: 0,
            totalAdSpend: 0,
            roas: 0,
            profitAfterAds: 0,
          },
          comparison: {
            revenueChange: 0,
            profitChange: 0,
            ordersChange: 0,
            aovChange: 0,
            prevTotalRevenue: 0,
            prevTotalNetProfit: 0,
            prevTotalOrders: 0,
          },
          chartData: [],
          topProducts: [],
          recentOrders: [],
        });
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, [store.id, dateRange.days]);

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

  // Navigation handler
  const navigateTo = (page: string) => {
    setActivePage(page);
    setSidebarOpen(false);
    // For now, just update state. In production, use Next.js router with ?shop param
  };

  // Loading skeleton
  if (loading || !analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-solid border-emerald-500 border-r-transparent mb-4"></div>
          <div className="text-white text-xl">Loading your profit data...</div>
        </div>
      </div>
    );
  }

  const { summary, comparison, chartData, topProducts, recentOrders } = analytics;

  // CSV Export function
  const exportToCSV = (type: 'orders' | 'products') => {
    if (type === 'orders' && recentOrders.length > 0) {
      const headers = ['Order Number', 'Date', 'Revenue', 'Profit', 'Margin'];
      const rows = recentOrders.map(o => [
        o.order_number,
        new Date(o.created_at).toLocaleDateString(),
        o.total_price.toFixed(2),
        o.net_profit.toFixed(2),
        o.profit_margin.toFixed(1) + '%'
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      downloadCSV(csv, 'orders-export.csv');
    } else if (type === 'products' && topProducts.length > 0) {
      const headers = ['Product', 'Revenue', 'Profit', 'Quantity', 'Margin'];
      const rows = topProducts.map(p => [
        `"${p.title}"`,
        p.revenue.toFixed(2),
        p.profit.toFixed(2),
        p.quantity,
        ((p.profit / p.revenue) * 100).toFixed(1) + '%'
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      downloadCSV(csv, 'products-export.csv');
    }
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Format change indicator
  const formatChange = (change: number) => {
    const isPositive = change >= 0;
    return (
      <span className={`text-sm font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
        {isPositive ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-screen w-64 bg-slate-900/90 backdrop-blur border-r border-white/10 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-white/10">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="ProfitPulse"
                width={40}
                height={40}
                className="rounded-xl"
              />
              <span className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                ProfitPulse
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            <button
              onClick={() => navigateTo('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                activePage === 'dashboard'
                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="font-medium">Dashboard</span>
            </button>

            <button
              onClick={() => navigateTo('products')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                activePage === 'products'
                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span className="font-medium">Products</span>
            </button>

            <button
              onClick={() => navigateTo('orders')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                activePage === 'orders'
                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span className="font-medium">Orders</span>
            </button>

            <button
              onClick={() => navigateTo('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                activePage === 'settings'
                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-medium">Settings</span>
            </button>
          </nav>

          {/* Store Info */}
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center justify-between mb-1">
              <div className="text-white font-medium truncate">{store.store_name || 'My Store'}</div>
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                store.subscription_status === 'active'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {store.subscription_status === 'active' ? 'Pro' : 'Trial'}
              </span>
            </div>
            <div className="text-white/40 text-sm truncate">{store.shop_domain}</div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        {/* Top Header */}
        <header className="bg-slate-900/50 backdrop-blur border-b border-white/10 sticky top-0 z-30">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden text-white hover:text-emerald-400 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-white">Profit Dashboard</h1>
            </div>

            <div className="flex items-center gap-3">
              {/* Date Range Picker */}
              <div className="relative">
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm font-medium transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {dateRange.label}
                  <svg className={`w-4 h-4 transition-transform ${showDatePicker ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showDatePicker && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowDatePicker(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-white/20 rounded-xl shadow-xl z-50 overflow-hidden">
                      <div className="p-2">
                        {(['7d', '14d', '30d', '90d'] as DateRangeOption[]).map((option) => (
                          <button
                            key={option}
                            onClick={() => {
                              setDateRangeOption(option);
                              setShowDatePicker(false);
                            }}
                            className={`w-full text-left px-4 py-2 rounded-lg text-sm transition ${
                              dateRangeOption === option
                                ? 'bg-emerald-600 text-white'
                                : 'text-white/80 hover:bg-white/10'
                            }`}
                          >
                            Last {option.replace('d', '')} days
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Trial Banner */}
        {store.subscription_status === 'trial' && store.trial_ends_at && (
          <div className="mx-6 mt-6 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-2 border-amber-500/50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/30 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-white">Free Trial Active</p>
                  <p className="text-amber-200/80 text-sm">
                    Ends {new Date(store.trial_ends_at).toLocaleDateString()}
                  </p>
                </div>
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
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition"
              >
                Upgrade to Pro - $29.99/mo
              </button>
            </div>
          </div>
        )}

        {/* Page Content */}
        {activePage === 'products' && <ProductsPage store={store} onBack={() => setActivePage('dashboard')} />}
        {activePage === 'orders' && <OrdersPage store={store} onBack={() => setActivePage('dashboard')} />}
        {activePage === 'settings' && <SettingsPage store={store} onBack={() => setActivePage('dashboard')} />}

        {activePage === 'dashboard' && (
        <div className="p-6">
          {/* Key Metrics - The money stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white/60 text-sm font-medium">Revenue</h3>
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-white mb-1">{formatCurrency(summary.totalRevenue)}</div>
              <div className="flex items-center gap-2">
                <span className="text-white/40 text-sm">{summary.totalOrders} orders</span>
                {comparison.revenueChange !== 0 && formatChange(comparison.revenueChange)}
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white/60 text-sm font-medium">Total Costs</h3>
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-red-400 mb-1">{formatCurrency(summary.totalCogs + summary.totalFees)}</div>
              <div className="text-white/40 text-sm">
                {formatCurrency(summary.totalCogs)} COGS + {formatCurrency(summary.totalFees)} fees
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white/60 text-sm font-medium">Net Profit</h3>
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className={`text-3xl font-bold mb-1 ${summary.totalNetProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(summary.totalNetProfit)}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/40 text-sm">{formatPercent(summary.avgProfitMargin)} margin</span>
                {comparison.profitChange !== 0 && formatChange(comparison.profitChange)}
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white/60 text-sm font-medium">Avg Profit/Order</h3>
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className={`text-3xl font-bold mb-1 ${summary.avgProfitPerOrder >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(summary.avgProfitPerOrder)}
              </div>
              <div className="text-white/40 text-sm">
                AOV: {formatCurrency(summary.avgOrderValue)}
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Revenue vs Profit Chart */}
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">Revenue vs Profit</h2>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-white/60">Revenue</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                    <span className="text-white/60">Profit</span>
                  </div>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.5)' }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                    />
                    <YAxis tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.5)' }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      labelStyle={{ color: 'white' }}
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
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      name="Profit"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Products by Profit */}
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">Top Products by Profit</h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => exportToCSV('products')}
                    className="text-white/60 hover:text-white text-sm font-medium transition flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    CSV
                  </button>
                  <button
                    onClick={() => navigateTo('products')}
                    className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition"
                  >
                    View All →
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {(topProducts || []).slice(0, 5).map((product, i) => {
                  const margin = product.margin || (product.revenue > 0 ? (product.profit / product.revenue) * 100 : 0);
                  const marginColor = margin >= 30 ? 'text-emerald-400' : margin >= 15 ? 'text-amber-400' : 'text-red-400';
                  return (
                    <div key={i} className="flex items-center justify-between py-3 border-b border-white/10 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{product.title}</p>
                        <p className="text-white/40 text-sm">{product.quantity} sold • {formatCurrency(product.revenue)} rev</p>
                      </div>
                      <div className="text-right ml-4">
                        <p className={`font-bold ${product.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {formatCurrency(product.profit)}
                        </p>
                        <p className={`text-sm ${marginColor}`}>
                          {formatPercent(margin)} margin
                        </p>
                      </div>
                    </div>
                  );
                })}
                {(!topProducts || topProducts.length === 0) && (
                  <div className="text-center py-8">
                    <p className="text-white/40">No product data yet</p>
                    <p className="text-white/30 text-sm mt-1">Set your COGS to see product profitability</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Additional Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Daily Orders Bar Chart */}
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <h2 className="text-lg font-bold text-white mb-6">Daily Orders</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.5)' }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                    />
                    <YAxis tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.5)' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      labelStyle={{ color: 'white' }}
                      labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    />
                    <Bar dataKey="orders" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Orders" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Cost Breakdown Pie Chart */}
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <h2 className="text-lg font-bold text-white mb-6">Revenue Breakdown</h2>
              <div className="h-64 flex items-center justify-center">
                {summary.totalRevenue > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Net Profit', value: Math.max(0, summary.totalNetProfit), color: '#10b981' },
                          { name: 'COGS', value: summary.totalCogs, color: '#ef4444' },
                          { name: 'Fees', value: summary.totalFees, color: '#f59e0b' },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {[
                          { name: 'Net Profit', value: Math.max(0, summary.totalNetProfit), color: '#10b981' },
                          { name: 'COGS', value: summary.totalCogs, color: '#ef4444' },
                          { name: 'Fees', value: summary.totalFees, color: '#f59e0b' },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        formatter={(value) => formatCurrency(value as number)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-white/40 text-center">No data yet</div>
                )}
              </div>
              {summary.totalRevenue > 0 && (
                <div className="flex justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                    <span className="text-white/60 text-sm">Profit</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-white/60 text-sm">COGS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                    <span className="text-white/60 text-sm">Fees</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Profit Coach */}
          <div className="mb-8">
            <AIProfitCoach
              store={store}
              summary={{
                totalRevenue: summary.totalRevenue,
                totalProfit: summary.totalNetProfit,
                avgProfitMargin: summary.avgProfitMargin,
                totalOrders: summary.totalOrders,
              }}
              topProducts={topProducts.map(p => ({
                title: p.title,
                profit: p.profit,
                margin: p.margin || (p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0),
                quantity: p.quantity,
              }))}
            />
          </div>

          {/* Cost Breakdown */}
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-bold text-white mb-6">Where Your Money Goes</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="text-white/60 text-sm mb-1">COGS</div>
                <div className="text-xl font-bold text-white">{formatCurrency(summary.totalCogs)}</div>
                <div className="text-white/40 text-sm">
                  {summary.totalRevenue > 0 ? formatPercent((summary.totalCogs / summary.totalRevenue) * 100) : '0%'} of revenue
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="text-white/60 text-sm mb-1">Payment Fees</div>
                <div className="text-xl font-bold text-white">{formatCurrency(summary.totalFees * 0.6)}</div>
                <div className="text-white/40 text-sm">~2.9% + $0.30</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="text-white/60 text-sm mb-1">Shopify Fees</div>
                <div className="text-xl font-bold text-white">{formatCurrency(summary.totalFees * 0.4)}</div>
                <div className="text-white/40 text-sm">Transaction fees</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="text-white/60 text-sm mb-1">You Keep</div>
                <div className={`text-xl font-bold ${summary.totalNetProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(summary.totalNetProfit)}
                </div>
                <div className="text-white/40 text-sm">{formatPercent(summary.avgProfitMargin)} margin</div>
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          {recentOrders && recentOrders.length > 0 && (
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">Recent Orders</h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => exportToCSV('orders')}
                    className="text-white/60 hover:text-white text-sm font-medium transition flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    CSV
                  </button>
                  <button
                    onClick={() => navigateTo('orders')}
                    className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition"
                  >
                    View All →
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {recentOrders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-600/20 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-white font-medium">#{order.order_number}</div>
                        <div className="text-white/40 text-sm">
                          {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-bold">{formatCurrency(order.total_price)}</div>
                      <div className={`text-sm ${order.net_profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(order.net_profit)} profit ({formatPercent(order.profit_margin)})
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        )}
      </main>
    </div>
  );
}
