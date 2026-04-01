'use client';

import { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';

// Lazy load heavy components to improve initial page load
const ProductsPage = lazy(() => import('./ProductsPage'));
const OrdersPage = lazy(() => import('./OrdersPage'));
const SettingsPage = lazy(() => import('./SettingsPage'));
const AIProfitCoach = lazy(() => import('./AIProfitCoach'));

// Dynamically import Recharts to reduce initial bundle (only load when dashboard is shown)
const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });
const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(mod => mod.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false });

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
  // Expenses
  totalMonthlyExpenses: number;
  expensesForPeriod: number;
  trueNetProfit: number;
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

interface BreakEvenData {
  monthlyFixedCosts: number;
  avgVariableCostRate: number;
  monthlyBreakEvenRevenue: number;
  currentMonthRevenue: number;
  progressPercent: number;
  revenueNeeded: number;
  ordersNeeded: number;
  ordersPerDayNeeded: number;
  daysRemaining: number;
  hasReachedBreakEven: boolean;
}

interface ForecastData {
  predictions: { date: string; predictedProfit: number; confidence: { low: number; high: number } }[];
  trend: 'up' | 'down' | 'stable';
  dailyTrend: number;
  sevenDayForecast: number;
  confidence: number;
  narrative: string;
}

interface AnalyticsData {
  summary: Summary;
  comparison: Comparison;
  chartData: ChartData[];
  topProducts: TopProduct[];
  recentOrders: RecentOrder[];
  breakEven?: BreakEvenData;
  goalProgress?: {
    todayProfit: number;
    monthProfit: number;
    avgDailyProfit: number;
    periodProfit: number;
    periodDays: number;
  };
}

type DateRangeOption = '7d' | '14d' | '30d' | '90d';

// Loading spinner for lazy-loaded pages
function PageLoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-solid border-emerald-500 border-r-transparent mb-3"></div>
        <div className="text-white/60 text-sm">Loading...</div>
      </div>
    </div>
  );
}

export default function Dashboard({ store }: { store: Store }) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRangeOption, setDateRangeOption] = useState<DateRangeOption>('30d');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activePage, setActivePage] = useState('dashboard');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [profitGoals, setProfitGoals] = useState<{ daily: number | null; monthly: number | null }>({ daily: null, monthly: null });
  const [dashboardWidgets, setDashboardWidgets] = useState({
    keyMetrics: true,
    trueNetProfit: true,
    profitGoals: true,
    breakEvenCalculator: true,
    profitForecast: true,
    periodComparison: true,
    revenueVsProfitChart: true,
    productProfitability: true,
    dailyOrdersChart: true,
    revenueBreakdownPie: true,
    industryBenchmarks: true,
    aiProfitCoach: true,
    costBreakdown: true,
    recentOrders: true,
  });
  const [syncingOrders, setSyncingOrders] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);

  // Profit goals are loaded together with analytics to reduce API calls
  // (see loadAnalytics below)

  // Calculate trial days left
  const getTrialDaysLeft = () => {
    if (!store?.trial_ends_at) return null;
    const trialEnd = new Date(store.trial_ends_at);
    const now = new Date();
    const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysLeft);
  };

  // Show onboarding only ONCE for new users
  useEffect(() => {
    if (store && !loading) {
      const storageKey = `profitpulse_onboarding_${store.id}`;
      const hasSeenOnboarding = localStorage.getItem(storageKey);
      if (hasSeenOnboarding !== 'true') {
        setShowOnboarding(true);
        // Immediately mark as seen to prevent re-showing on refresh
        localStorage.setItem(storageKey, 'true');
      }
    }
  }, [store, loading]);

  // Auto-sync historical orders on first load if no orders exist
  useEffect(() => {
    async function autoSyncOrders() {
      if (!store || loading || !analytics) return;

      // Check if already synced (localStorage flag)
      const alreadySynced = localStorage.getItem(`profitpulse_initial_sync_${store.id}`);
      if (alreadySynced === 'true') return;

      // Only sync if user has 0 orders (new install)
      if (analytics.summary.totalOrders === 0 && analytics.recentOrders.length === 0) {
        setSyncingOrders(true);
        setSyncProgress('Syncing your historical orders from Shopify...');

        try {
          // Sync products first
          setSyncProgress('Syncing products...');
          await fetch('/api/products/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ store_id: store.id }),
          });

          // Then sync orders
          setSyncProgress('Syncing orders (this may take a moment)...');
          const orderRes = await fetch('/api/orders/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ store_id: store.id }),
          });

          const orderData = await orderRes.json();

          if (orderData.success) {
            setSyncProgress(`Synced ${orderData.synced} orders! Refreshing...`);
            // Mark as synced
            localStorage.setItem(`profitpulse_initial_sync_${store.id}`, 'true');
            // Reload analytics
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } else {
            setSyncProgress(null);
            setSyncingOrders(false);
          }
        } catch (err) {
          console.error('Auto-sync error:', err);
          setSyncProgress(null);
          setSyncingOrders(false);
        }
      } else {
        // User has orders, mark as synced
        localStorage.setItem(`profitpulse_initial_sync_${store.id}`, 'true');
      }
    }
    autoSyncOrders();
  }, [store, loading, analytics]);

  const completeOnboarding = async () => {
    if (store) {
      // Save to localStorage immediately
      localStorage.setItem(`profitpulse_onboarding_${store.id}`, 'true');

      // Also save to database (persistent)
      try {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ store_id: store.id, onboarding_completed: true }),
        });
      } catch (err) {
        console.error('Error saving onboarding status:', err);
      }
    }
    setShowOnboarding(false);
    setOnboardingStep(1);
  };

  const dateRange = useMemo(() => {
    const days = dateRangeOption === '7d' ? 7 : dateRangeOption === '14d' ? 14 : dateRangeOption === '30d' ? 30 : 90;
    return { days, label: `Last ${days} days` };
  }, [dateRangeOption]);

  useEffect(() => {
    async function loadAnalytics() {
      setLoading(true);
      try {
        // Fetch analytics and settings in parallel for better performance
        const [analyticsRes, settingsRes] = await Promise.all([
          fetch(`/api/analytics/summary?store_id=${store.id}&days=${dateRange.days}`),
          fetch(`/api/settings?store_id=${store.id}`),
        ]);

        // Handle settings (profit goals + dashboard widgets)
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          if (settingsData.settings) {
            setProfitGoals({
              daily: settingsData.settings.profit_goal_daily || null,
              monthly: settingsData.settings.profit_goal_monthly || null,
            });
            // Load dashboard widget preferences
            if (settingsData.settings.dashboard_widgets) {
              setDashboardWidgets(prev => ({ ...prev, ...settingsData.settings.dashboard_widgets }));
            }
          }
        }

        if (!analyticsRes.ok) {
          const errorData = await analyticsRes.json().catch(() => ({}));
          console.warn('Analytics API error:', analyticsRes.status, errorData);
          // If subscription issue, the user will see the trial banner / upgrade prompt
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
              totalMonthlyExpenses: 0,
              expensesForPeriod: 0,
              trueNetProfit: 0,
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

        const data = await analyticsRes.json();
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
            totalMonthlyExpenses: 0,
            expensesForPeriod: 0,
            trueNetProfit: 0,
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

  // Refresh settings (dashboard widgets, profit goals) from API
  const refreshSettings = async () => {
    try {
      const res = await fetch(`/api/settings?store_id=${store.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setProfitGoals({
            daily: data.settings.profit_goal_daily || null,
            monthly: data.settings.profit_goal_monthly || null,
          });
          if (data.settings.dashboard_widgets) {
            setDashboardWidgets(prev => ({ ...prev, ...data.settings.dashboard_widgets }));
          }
        }
      }
    } catch (err) {
      console.error('Error refreshing settings:', err);
    }
  };

  // Navigation handler
  const navigateTo = (page: string) => {
    setActivePage(page);
    setSidebarOpen(false);
    // Refresh settings when navigating to dashboard (picks up changes from Settings page)
    if (page === 'dashboard') {
      refreshSettings();
    }
  };

  // Loading skeleton
  if (loading || !analytics) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-solid border-emerald-500 border-r-transparent mb-4"></div>
          <div className="text-white text-xl">Loading your profit data...</div>
        </div>
      </div>
    );
  }

  // Syncing orders overlay
  if (syncingOrders) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-emerald-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Setting up your dashboard</h2>
          <p className="text-white/60 mb-4">{syncProgress}</p>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div className="bg-emerald-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
          <p className="text-white/40 text-sm mt-4">This only happens once. We&apos;re importing your last 90 days of orders.</p>
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
    <div className="min-h-screen bg-zinc-950">
      {/* Onboarding Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`w-2 h-2 rounded-full transition-all ${
                    step === onboardingStep ? 'bg-emerald-500 w-6' : step < onboardingStep ? 'bg-emerald-500' : 'bg-zinc-700'
                  }`}
                />
              ))}
            </div>

            {onboardingStep === 1 && (
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Welcome to ProfitPulse!</h2>
                <p className="text-zinc-400 mb-6">
                  See your true profit after all costs - COGS, fees, shipping, and more.
                </p>
              </div>
            )}

            {onboardingStep === 2 && (
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Set Your Product Costs</h2>
                <p className="text-zinc-400 mb-6">
                  Go to Products and enter your cost of goods (COGS) for each item to calculate accurate profit margins.
                </p>
              </div>
            )}

            {onboardingStep === 3 && (
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">AI Profit Coach</h2>
                <p className="text-zinc-400 mb-6">
                  Get personalized recommendations to increase your profit margins based on your data.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              {onboardingStep > 1 && (
                <button
                  onClick={() => setOnboardingStep(onboardingStep - 1)}
                  className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition"
                >
                  Back
                </button>
              )}
              {onboardingStep < 3 ? (
                <button
                  onClick={() => setOnboardingStep(onboardingStep + 1)}
                  className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={completeOnboarding}
                  className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition"
                >
                  Get Started
                </button>
              )}
            </div>

            {onboardingStep < 3 && (
              <button
                onClick={completeOnboarding}
                className="w-full mt-3 text-zinc-500 hover:text-zinc-400 text-sm transition"
              >
                Skip tutorial
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-screen w-64 bg-zinc-900 border-r border-zinc-800 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-zinc-800">
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
                  : 'text-white/60 hover:bg-zinc-900/50 hover:text-white'
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
                  : 'text-white/60 hover:bg-zinc-900/50 hover:text-white'
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
                  : 'text-white/60 hover:bg-zinc-900/50 hover:text-white'
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
                  : 'text-white/60 hover:bg-zinc-900/50 hover:text-white'
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
          <div className="p-4 border-t border-zinc-800">
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
        <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-30">
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
              {/* Help Button */}
              <button
                onClick={() => setShowOnboarding(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-300 text-sm font-medium transition"
                title="Quick Start Guide"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Help
              </button>

              {/* Trial Badge */}
              {(() => {
                const trialDays = getTrialDaysLeft();
                if (store?.subscription_status === 'active') {
                  return (
                    <span className="px-3 py-1 bg-green-600/20 border border-green-500/30 rounded-full text-green-300 text-sm font-medium">
                      Pro Plan
                    </span>
                  );
                }
                if (trialDays !== null) {
                  return (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      trialDays <= 3
                        ? 'bg-red-500/20 border border-red-500/30 text-red-300'
                        : 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                    }`}>
                      {trialDays} day{trialDays !== 1 ? 's' : ''} left
                    </span>
                  );
                }
                return null;
              })()}

              {/* Date Range Picker */}
              <div className="relative">
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-white text-sm font-medium transition"
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
                    <div className="absolute right-0 mt-2 w-48 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden">
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
                                : 'text-white/80 hover:bg-zinc-800'
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

        {/* Page Content - Lazy loaded with loading fallback */}
        {activePage === 'products' && (
          <Suspense fallback={<PageLoadingSpinner />}>
            <ProductsPage store={store} onBack={() => setActivePage('dashboard')} />
          </Suspense>
        )}
        {activePage === 'orders' && (
          <Suspense fallback={<PageLoadingSpinner />}>
            <OrdersPage store={store} onBack={() => setActivePage('dashboard')} />
          </Suspense>
        )}
        {activePage === 'settings' && (
          <Suspense fallback={<PageLoadingSpinner />}>
            <SettingsPage store={store} onBack={() => setActivePage('dashboard')} />
          </Suspense>
        )}

        {activePage === 'dashboard' && (
        <div className="p-6">
          {/* Key Metrics - The money stats */}
          {dashboardWidgets.keyMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-zinc-900/50 backdrop-blur border border-zinc-800 rounded-xl p-6">
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

            <div className="bg-zinc-900/50 backdrop-blur border border-zinc-800 rounded-xl p-6">
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

            <div className="bg-zinc-900/50 backdrop-blur border border-zinc-800 rounded-xl p-6">
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

            <div className="bg-zinc-900/50 backdrop-blur border border-zinc-800 rounded-xl p-6">
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
          )}

          {/* True Net Profit - After ALL Costs */}
          {dashboardWidgets.trueNetProfit && (summary.totalAdSpend > 0 || summary.expensesForPeriod > 0) && (
            <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-red-500/10 border border-purple-500/30 rounded-xl p-6 mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">True Net Profit</h2>
                    <p className="text-white/60 text-sm">After COGS, fees, ads & operating expenses</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-bold ${summary.trueNetProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCurrency(summary.trueNetProfit)}
                  </div>
                  <div className="text-white/40 text-sm">
                    {summary.totalRevenue > 0 ? formatPercent((summary.trueNetProfit / summary.totalRevenue) * 100) : '0%'} true margin
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-white/10">
                <div className="text-center">
                  <div className="text-white/60 text-xs mb-1">Order Profit</div>
                  <div className="text-white font-medium">{formatCurrency(summary.totalNetProfit)}</div>
                </div>
                <div className="text-center">
                  <div className="text-white/60 text-xs mb-1">Ad Spend</div>
                  <div className="text-red-400 font-medium">-{formatCurrency(summary.totalAdSpend)}</div>
                </div>
                <div className="text-center">
                  <div className="text-white/60 text-xs mb-1">Expenses ({dateRange.days}d)</div>
                  <div className="text-red-400 font-medium">-{formatCurrency(summary.expensesForPeriod)}</div>
                </div>
                <div className="text-center">
                  <div className="text-white/60 text-xs mb-1">Monthly Expenses</div>
                  <div className="text-white/60 font-medium">{formatCurrency(summary.totalMonthlyExpenses)}/mo</div>
                </div>
              </div>
              <button
                onClick={() => navigateTo('settings')}
                className="mt-4 text-purple-400 hover:text-purple-300 text-sm font-medium transition flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Manage Expenses & Ad Spend
              </button>
            </div>
          )}

          {/* Profit Goals Progress */}
          {dashboardWidgets.profitGoals && (() => {
            const hasGoals = (profitGoals.daily && profitGoals.daily > 0) || (profitGoals.monthly && profitGoals.monthly > 0);
            if (!hasGoals) return null;

            // Use goalProgress from API
            const gp = analytics?.goalProgress;
            const todayProfit = gp?.todayProfit || 0;
            const monthProfit = gp?.monthProfit || 0;
            const avgDailyProfit = gp?.avgDailyProfit || 0;
            const periodProfit = gp?.periodProfit || 0;

            // Use period average as fallback when no today/month data
            const dailyDisplay = todayProfit > 0 ? todayProfit : avgDailyProfit;
            const dailyLabel = todayProfit > 0 ? "Today's Profit" : `Avg Daily (${dateRange.days}d)`;
            const monthlyDisplay = monthProfit > 0 ? monthProfit : periodProfit;
            const monthlyLabel = monthProfit > 0 ? "This Month" : `Period Total (${dateRange.days}d)`;

            return (
              <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Profit Goals</h2>
                    <p className="text-white/60 text-sm">Track your progress towards your targets</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {profitGoals.daily && profitGoals.daily > 0 && (
                    <div className="bg-white/5 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white/60 text-sm">{dailyLabel}</span>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          dailyDisplay >= profitGoals.daily
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : dailyDisplay >= profitGoals.daily * 0.75
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-white/10 text-white/60'
                        }`}>
                          {dailyDisplay >= profitGoals.daily ? 'On Track!' : `${Math.round((dailyDisplay / profitGoals.daily) * 100)}%`}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2 mb-3">
                        <span className={`text-2xl font-bold ${dailyDisplay >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {formatCurrency(dailyDisplay)}
                        </span>
                        <span className="text-white/40 text-sm">/ {formatCurrency(profitGoals.daily)} goal</span>
                      </div>
                      <div className="relative h-3 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${
                            dailyDisplay >= profitGoals.daily ? 'bg-emerald-500' : 'bg-emerald-500/70'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, (dailyDisplay / profitGoals.daily) * 100))}%` }}
                        />
                      </div>
                      <p className="text-white/40 text-xs mt-2">
                        {dailyDisplay >= profitGoals.daily
                          ? `Exceeding goal by ${formatCurrency(dailyDisplay - profitGoals.daily)}`
                          : todayProfit > 0
                            ? `${formatCurrency(profitGoals.daily - dailyDisplay)} to go today`
                            : `Need ${formatCurrency(profitGoals.daily - dailyDisplay)} more daily avg`}
                      </p>
                    </div>
                  )}
                  {profitGoals.monthly && profitGoals.monthly > 0 && (
                    <div className="bg-white/5 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white/60 text-sm">{monthlyLabel}</span>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          monthlyDisplay >= profitGoals.monthly
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : monthlyDisplay >= profitGoals.monthly * 0.75
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-white/10 text-white/60'
                        }`}>
                          {monthlyDisplay >= profitGoals.monthly ? 'On Track!' : `${Math.round((monthlyDisplay / profitGoals.monthly) * 100)}%`}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2 mb-3">
                        <span className={`text-2xl font-bold ${monthlyDisplay >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {formatCurrency(monthlyDisplay)}
                        </span>
                        <span className="text-white/40 text-sm">/ {formatCurrency(profitGoals.monthly)} goal</span>
                      </div>
                      <div className="relative h-3 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${
                            monthlyDisplay >= profitGoals.monthly ? 'bg-emerald-500' : 'bg-cyan-500/70'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, (monthlyDisplay / profitGoals.monthly) * 100))}%` }}
                        />
                      </div>
                      <p className="text-white/40 text-xs mt-2">
                        {monthlyDisplay >= profitGoals.monthly
                          ? `Exceeding goal by ${formatCurrency(monthlyDisplay - profitGoals.monthly)}`
                          : monthProfit > 0
                            ? `${formatCurrency(profitGoals.monthly - monthlyDisplay)} to go this month`
                            : `Need ${formatCurrency(profitGoals.monthly - monthlyDisplay)} more in period`}
                      </p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => navigateTo('settings')}
                  className="mt-4 text-emerald-400 hover:text-emerald-300 text-sm font-medium transition flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Edit Goals in Settings
                </button>
              </div>
            );
          })()}

          {/* Break-Even Calculator Widget */}
          {dashboardWidgets.breakEvenCalculator && analytics?.breakEven && analytics.breakEven.monthlyFixedCosts > 0 && (
            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Break-Even Calculator</h2>
                    <p className="text-white/60 text-sm">Monthly revenue needed to cover fixed costs</p>
                  </div>
                </div>
                {analytics.breakEven.hasReachedBreakEven && (
                  <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-400 text-sm font-medium">
                    Break-even reached!
                  </span>
                )}
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/60 text-sm">Progress this month</span>
                  <span className={`text-sm font-medium ${analytics.breakEven.hasReachedBreakEven ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {analytics.breakEven.progressPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="relative h-4 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${
                      analytics.breakEven.hasReachedBreakEven ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-orange-500'
                    }`}
                    style={{ width: `${Math.min(analytics.breakEven.progressPercent, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-white/40 text-xs">{formatCurrency(analytics.breakEven.currentMonthRevenue)}</span>
                  <span className="text-white/40 text-xs">{formatCurrency(analytics.breakEven.monthlyBreakEvenRevenue)} target</span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-white/50 text-xs mb-1">Fixed Costs</div>
                  <div className="text-white font-bold">{formatCurrency(analytics.breakEven.monthlyFixedCosts)}/mo</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-white/50 text-xs mb-1">Break-Even Target</div>
                  <div className="text-amber-400 font-bold">{formatCurrency(analytics.breakEven.monthlyBreakEvenRevenue)}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-white/50 text-xs mb-1">Revenue Needed</div>
                  <div className={`font-bold ${analytics.breakEven.revenueNeeded === 0 ? 'text-emerald-400' : 'text-white'}`}>
                    {analytics.breakEven.revenueNeeded === 0 ? 'Done!' : formatCurrency(analytics.breakEven.revenueNeeded)}
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-white/50 text-xs mb-1">Orders/Day Needed</div>
                  <div className={`font-bold ${analytics.breakEven.ordersPerDayNeeded === 0 ? 'text-emerald-400' : 'text-white'}`}>
                    {analytics.breakEven.ordersPerDayNeeded === 0 ? 'Done!' : `~${analytics.breakEven.ordersPerDayNeeded}`}
                  </div>
                </div>
              </div>

              <p className="text-white/40 text-xs mt-4">
                {analytics.breakEven.daysRemaining} days left in month. Based on your expenses and average variable cost rate of {(analytics.breakEven.avgVariableCostRate * 100).toFixed(0)}%.
              </p>

              <button
                onClick={() => navigateTo('settings')}
                className="mt-3 text-amber-400 hover:text-amber-300 text-sm font-medium transition flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Expenses for accurate tracking
              </button>
            </div>
          )}

          {/* AI Profit Forecast Widget */}
          {dashboardWidgets.profitForecast && (
            <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-xl p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">AI Profit Forecast</h2>
                    <p className="text-white/60 text-sm">7-day prediction with AI insights</p>
                  </div>
                </div>
                {!forecast && !forecastLoading && (
                  <button
                    onClick={async () => {
                      setForecastLoading(true);
                      try {
                        const res = await fetch('/api/analytics/forecast', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ store_id: store.id, days: 7 }),
                        });
                        const data = await res.json();
                        if (res.ok && !data.error) {
                          setForecast(data);
                        }
                      } catch (err) {
                        console.error('Forecast error:', err);
                      }
                      setForecastLoading(false);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Generate Forecast
                  </button>
                )}
              </div>

              {forecastLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-indigo-500 border-r-transparent"></div>
                  <span className="ml-3 text-white/60">Analyzing trends...</span>
                </div>
              )}

              {forecast && (
                <div className="space-y-4">
                  {/* Trend indicator */}
                  <div className="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      forecast.trend === 'up' ? 'bg-emerald-500/20' :
                      forecast.trend === 'down' ? 'bg-red-500/20' : 'bg-gray-500/20'
                    }`}>
                      <svg className={`w-6 h-6 ${
                        forecast.trend === 'up' ? 'text-emerald-400' :
                        forecast.trend === 'down' ? 'text-red-400 rotate-180' : 'text-gray-400'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium">
                        {forecast.trend === 'up' ? 'Upward Trend' :
                         forecast.trend === 'down' ? 'Downward Trend' : 'Stable Trend'}
                      </div>
                      <div className="text-white/60 text-sm">
                        {forecast.trend === 'stable' ? 'Profit holding steady' :
                          `${forecast.trend === 'up' ? '+' : ''}${formatCurrency(forecast.dailyTrend)}/day`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white/50 text-xs">Confidence</div>
                      <div className={`text-lg font-bold ${
                        forecast.confidence >= 70 ? 'text-emerald-400' :
                        forecast.confidence >= 40 ? 'text-amber-400' : 'text-red-400'
                      }`}>{forecast.confidence}%</div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-lg p-4 text-center">
                      <div className="text-white/50 text-xs mb-1">7-Day Forecast</div>
                      <div className={`text-2xl font-bold ${forecast.sevenDayForecast >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(forecast.sevenDayForecast)}
                      </div>
                      <div className="text-white/40 text-xs">predicted profit</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4 text-center">
                      <div className="text-white/50 text-xs mb-1">Daily Average</div>
                      <div className={`text-2xl font-bold ${forecast.sevenDayForecast >= 0 ? 'text-indigo-400' : 'text-red-400'}`}>
                        {formatCurrency(forecast.sevenDayForecast / 7)}
                      </div>
                      <div className="text-white/40 text-xs">per day expected</div>
                    </div>
                  </div>

                  {/* Mini chart visualization */}
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-white/50 text-xs mb-2">Forecast Timeline</div>
                    <div className="flex items-end gap-1 h-16">
                      {forecast.predictions.map((p, i) => {
                        const maxProfit = Math.max(...forecast.predictions.map(x => Math.abs(x.predictedProfit)), 1);
                        const height = Math.max(10, (Math.abs(p.predictedProfit) / maxProfit) * 100);
                        return (
                          <div
                            key={i}
                            className="flex-1 flex flex-col items-center gap-1"
                            title={`${p.date}: ${formatCurrency(p.predictedProfit)}`}
                          >
                            <div
                              className={`w-full rounded-t transition-all ${
                                p.predictedProfit >= 0 ? 'bg-indigo-500' : 'bg-red-500'
                              }`}
                              style={{ height: `${height}%` }}
                            />
                            <span className="text-white/40 text-[10px]">
                              {new Date(p.date).toLocaleDateString('en-US', { weekday: 'narrow' })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* AI Narrative */}
                  {forecast.narrative && (
                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-indigo-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-indigo-400 text-xs font-medium mb-1">AI Insight</div>
                          <p className="text-white/80 text-sm italic">&quot;{forecast.narrative}&quot;</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setForecast(null)}
                    className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Regenerate Forecast
                  </button>
                </div>
              )}

              {!forecast && !forecastLoading && (
                <div className="text-center py-6">
                  <p className="text-white/40 text-sm">
                    Click &quot;Generate Forecast&quot; to see your 7-day profit prediction with AI-powered insights.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Period Comparison */}
          {dashboardWidgets.periodComparison && (
          <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-emerald-500/10 border border-blue-500/30 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Period Comparison</h2>
                <p className="text-white/60 text-sm">{dateRange.label} vs previous {dateRange.days} days</p>
              </div>
            </div>
            {(comparison.prevTotalRevenue > 0 || comparison.prevTotalNetProfit !== 0 || comparison.prevTotalOrders > 0) ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-white/60 text-sm mb-1">Revenue</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-white">{formatCurrency(summary.totalRevenue)}</span>
                    <span className={`text-sm font-medium ${comparison.revenueChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {comparison.revenueChange >= 0 ? '+' : ''}{comparison.revenueChange.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-white/40 text-xs mt-1">
                    was {formatCurrency(comparison.prevTotalRevenue)}
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-white/60 text-sm mb-1">Net Profit</div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-xl font-bold ${summary.totalNetProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatCurrency(summary.totalNetProfit)}
                    </span>
                    <span className={`text-sm font-medium ${comparison.profitChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {comparison.profitChange >= 0 ? '+' : ''}{comparison.profitChange.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-white/40 text-xs mt-1">
                    was {formatCurrency(comparison.prevTotalNetProfit)}
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-white/60 text-sm mb-1">Orders</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-white">{summary.totalOrders}</span>
                    <span className={`text-sm font-medium ${comparison.ordersChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {comparison.ordersChange >= 0 ? '+' : ''}{comparison.ordersChange.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-white/40 text-xs mt-1">
                    was {comparison.prevTotalOrders}
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-white/60 text-sm mb-1">Avg Order Value</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-white">{formatCurrency(summary.avgOrderValue)}</span>
                    <span className={`text-sm font-medium ${comparison.aovChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {comparison.aovChange >= 0 ? '+' : ''}{comparison.aovChange.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-white/40 text-xs mt-1">
                    {comparison.prevTotalOrders > 0 ? `was ${formatCurrency(comparison.prevTotalRevenue / comparison.prevTotalOrders)}` : 'no previous data'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white/5 rounded-lg p-6 text-center">
                <p className="text-white/60">No previous period data available for comparison</p>
                <p className="text-white/40 text-sm mt-1">Need {dateRange.days * 2} days of data to compare {dateRange.days}-day periods</p>
              </div>
            )}
          </div>
          )}

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Revenue vs Profit Chart */}
            {dashboardWidgets.revenueVsProfitChart && (
            <div className="bg-zinc-900/50 backdrop-blur border border-zinc-800 rounded-xl p-6">
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
            )}

            {/* Top Products by Profit */}
            {dashboardWidgets.productProfitability && (
            <div className="bg-zinc-900/50 backdrop-blur border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white">Product Profitability</h2>
                  <p className="text-white/40 text-sm">Top performers vs losers</p>
                </div>
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
              {(() => {
                const totalProfit = topProducts.reduce((sum, p) => sum + p.profit, 0);
                const profitableProducts = topProducts.filter(p => p.profit > 0).slice(0, 5);
                const losingProducts = topProducts.filter(p => p.profit < 0).slice(0, 3);

                return (
                  <div className="space-y-4">
                    {/* Top Performers */}
                    {profitableProducts.length > 0 && (
                      <div>
                        <div className="text-emerald-400/60 text-xs font-medium mb-2 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                          </svg>
                          TOP PERFORMERS
                        </div>
                        <div className="space-y-2">
                          {profitableProducts.map((product, i) => {
                            const margin = product.margin || (product.revenue > 0 ? (product.profit / product.revenue) * 100 : 0);
                            const contribution = totalProfit > 0 ? (product.profit / totalProfit) * 100 : 0;
                            return (
                              <div key={i} className="flex items-center gap-3 py-2 px-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                                <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center">
                                  <span className="text-emerald-400 text-xs font-bold">#{i + 1}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-white font-medium truncate text-sm">{product.title}</p>
                                  <p className="text-white/40 text-xs">{product.quantity} sold · {contribution.toFixed(0)}% of profit</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-emerald-400 font-bold text-sm">{formatCurrency(product.profit)}</p>
                                  <p className="text-emerald-400/60 text-xs">{formatPercent(margin)}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Losing Products */}
                    {losingProducts.length > 0 && (
                      <div>
                        <div className="text-red-400/60 text-xs font-medium mb-2 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" />
                          </svg>
                          LOSING MONEY
                        </div>
                        <div className="space-y-2">
                          {losingProducts.map((product, i) => {
                            const margin = product.margin || (product.revenue > 0 ? (product.profit / product.revenue) * 100 : 0);
                            return (
                              <div key={i} className="flex items-center gap-3 py-2 px-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                                <div className="w-6 h-6 bg-red-500/20 rounded-full flex items-center justify-center">
                                  <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-white font-medium truncate text-sm">{product.title}</p>
                                  <p className="text-white/40 text-xs">{product.quantity} sold · Check your COGS</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-red-400 font-bold text-sm">{formatCurrency(product.profit)}</p>
                                  <p className="text-red-400/60 text-xs">{formatPercent(margin)}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {topProducts.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-white/40">No product data yet</p>
                        <p className="text-white/30 text-sm mt-1">Set your COGS to see product profitability</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            )}
          </div>

          {/* Additional Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Daily Orders Bar Chart */}
            {dashboardWidgets.dailyOrdersChart && (
            <div className="bg-zinc-900/50 backdrop-blur border border-zinc-800 rounded-xl p-6">
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
            )}

            {/* Cost Breakdown Pie Chart */}
            {dashboardWidgets.revenueBreakdownPie && (
            <div className="bg-zinc-900/50 backdrop-blur border border-zinc-800 rounded-xl p-6">
              <h2 className="text-lg font-bold text-white mb-6">Revenue Breakdown</h2>
              <div className="h-64 flex items-center justify-center">
                {summary.totalRevenue > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Net Profit', value: Math.max(0, summary.totalNetProfit), fill: '#10b981' },
                          { name: 'COGS', value: summary.totalCogs, fill: '#ef4444' },
                          { name: 'Fees', value: summary.totalFees, fill: '#f59e0b' },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                      />
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
            )}
          </div>

          {/* Industry Benchmarks */}
          {dashboardWidgets.industryBenchmarks && (
          <div className="bg-zinc-900/50 backdrop-blur border border-zinc-800 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Industry Benchmarks</h2>
                <p className="text-white/60 text-sm">How you compare to typical ecommerce stores</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Profit Margin Benchmark */}
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white/60 text-sm">Profit Margin</span>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    summary.avgProfitMargin >= 25 ? 'bg-emerald-500/20 text-emerald-400' :
                    summary.avgProfitMargin >= 15 ? 'bg-amber-500/20 text-amber-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {summary.avgProfitMargin >= 25 ? 'Above Average' :
                     summary.avgProfitMargin >= 15 ? 'Average' : 'Below Average'}
                  </span>
                </div>
                <div className="relative h-3 bg-zinc-800 rounded-full overflow-hidden mb-2">
                  <div
                    className={`absolute left-0 top-0 h-full rounded-full ${
                      summary.avgProfitMargin >= 25 ? 'bg-emerald-500' :
                      summary.avgProfitMargin >= 15 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(100, (summary.avgProfitMargin / 40) * 100)}%` }}
                  />
                  {/* Benchmark marker at 20% */}
                  <div className="absolute top-0 h-full w-0.5 bg-white/40" style={{ left: '50%' }} title="Industry avg: 20%"/>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white font-medium">You: {formatPercent(summary.avgProfitMargin)}</span>
                  <span className="text-white/40">Industry avg: 15-25%</span>
                </div>
              </div>

              {/* AOV Benchmark */}
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white/60 text-sm">Avg Order Value</span>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    summary.avgOrderValue >= 80 ? 'bg-emerald-500/20 text-emerald-400' :
                    summary.avgOrderValue >= 45 ? 'bg-amber-500/20 text-amber-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {summary.avgOrderValue >= 80 ? 'Above Average' :
                     summary.avgOrderValue >= 45 ? 'Average' : 'Below Average'}
                  </span>
                </div>
                <div className="relative h-3 bg-zinc-800 rounded-full overflow-hidden mb-2">
                  <div
                    className={`absolute left-0 top-0 h-full rounded-full ${
                      summary.avgOrderValue >= 80 ? 'bg-emerald-500' :
                      summary.avgOrderValue >= 45 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(100, (summary.avgOrderValue / 150) * 100)}%` }}
                  />
                  {/* Benchmark marker at ~$60 */}
                  <div className="absolute top-0 h-full w-0.5 bg-white/40" style={{ left: '40%' }} title="Industry avg: $60"/>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white font-medium">You: {formatCurrency(summary.avgOrderValue)}</span>
                  <span className="text-white/40">Industry avg: $45-$80</span>
                </div>
              </div>

              {/* Profit Per Order Benchmark */}
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white/60 text-sm">Profit Per Order</span>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    summary.avgProfitPerOrder >= 15 ? 'bg-emerald-500/20 text-emerald-400' :
                    summary.avgProfitPerOrder >= 8 ? 'bg-amber-500/20 text-amber-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {summary.avgProfitPerOrder >= 15 ? 'Above Average' :
                     summary.avgProfitPerOrder >= 8 ? 'Average' : 'Below Average'}
                  </span>
                </div>
                <div className="relative h-3 bg-zinc-800 rounded-full overflow-hidden mb-2">
                  <div
                    className={`absolute left-0 top-0 h-full rounded-full ${
                      summary.avgProfitPerOrder >= 15 ? 'bg-emerald-500' :
                      summary.avgProfitPerOrder >= 8 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(100, (summary.avgProfitPerOrder / 30) * 100)}%` }}
                  />
                  {/* Benchmark marker at $12 */}
                  <div className="absolute top-0 h-full w-0.5 bg-white/40" style={{ left: '40%' }} title="Industry avg: $12"/>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white font-medium">You: {formatCurrency(summary.avgProfitPerOrder)}</span>
                  <span className="text-white/40">Industry avg: $8-$15</span>
                </div>
              </div>
            </div>
            <p className="text-white/30 text-xs mt-4 text-center">
              Benchmarks based on typical Shopify store data. Individual results may vary by industry.
            </p>
          </div>
          )}

          {/* AI Profit Coach - Lazy loaded */}
          {dashboardWidgets.aiProfitCoach && (
          <div className="mb-8">
            <Suspense fallback={
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 animate-pulse">
                <div className="h-6 bg-zinc-800 rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-zinc-800 rounded w-full mb-2"></div>
                <div className="h-4 bg-zinc-800 rounded w-2/3"></div>
              </div>
            }>
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
            </Suspense>
          </div>
          )}

          {/* Cost Breakdown */}
          {dashboardWidgets.costBreakdown && (
          <div className="bg-zinc-900/50 backdrop-blur border border-zinc-800 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-bold text-white mb-6">Where Your Money Goes</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
                <div className="text-white/60 text-sm mb-1">COGS</div>
                <div className="text-xl font-bold text-white">{formatCurrency(summary.totalCogs)}</div>
                <div className="text-white/40 text-sm">
                  {summary.totalRevenue > 0 ? formatPercent((summary.totalCogs / summary.totalRevenue) * 100) : '0%'} of revenue
                </div>
              </div>
              <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
                <div className="text-white/60 text-sm mb-1">Payment Fees</div>
                <div className="text-xl font-bold text-white">{formatCurrency(summary.totalFees * 0.6)}</div>
                <div className="text-white/40 text-sm">~2.9% + $0.30</div>
              </div>
              <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
                <div className="text-white/60 text-sm mb-1">Shopify Fees</div>
                <div className="text-xl font-bold text-white">{formatCurrency(summary.totalFees * 0.4)}</div>
                <div className="text-white/40 text-sm">Transaction fees</div>
              </div>
              <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
                <div className="text-white/60 text-sm mb-1">You Keep</div>
                <div className={`text-xl font-bold ${summary.totalNetProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(summary.totalNetProfit)}
                </div>
                <div className="text-white/40 text-sm">{formatPercent(summary.avgProfitMargin)} margin</div>
              </div>
            </div>
          </div>
          )}

          {/* Recent Orders */}
          {dashboardWidgets.recentOrders && recentOrders && recentOrders.length > 0 && (
            <div className="bg-zinc-900/50 backdrop-blur border border-zinc-800 rounded-xl p-6">
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
                  <div key={order.id} className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-lg">
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
