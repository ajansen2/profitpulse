'use client';

import { useEffect, useState } from 'react';
import { Toast, useToast } from './Toast';

interface Store {
  id: string;
  store_name: string;
  shop_domain: string;
  email?: string;
  subscription_status: string;
  trial_ends_at: string | null;
}

interface StoreSettings {
  id?: string;
  default_cogs_percentage: number;
  default_shipping_cost: number;
  payment_processing_rate: number;
  payment_processing_fixed: number;
  shopify_plan: string;
  shopify_fee_rate: number;
  include_taxes_in_revenue: boolean;
  include_shipping_in_revenue: boolean;
  email_daily_digest: boolean;
  email_weekly_summary: boolean;
  email_profit_alerts: boolean;
  email_alert_threshold: number;
  slack_webhook_url?: string;
  notification_email?: string;
  profit_goal_daily?: number;
  profit_goal_monthly?: number;
}

interface HiddenFee {
  type: string;
  description: string;
  amount: number;
  potential_savings: number;
  recommendation: string;
}

interface Expense {
  id: string;
  name: string;
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  category: 'shopify' | 'apps' | 'marketing' | 'shipping' | 'other';
}

interface SettingsPageProps {
  store: Store;
  onBack: () => void;
}

const SHOPIFY_PLANS = [
  { value: 'basic', label: 'Basic Shopify', rate: 0.02 },
  { value: 'shopify', label: 'Shopify', rate: 0.01 },
  { value: 'advanced', label: 'Advanced Shopify', rate: 0.005 },
  { value: 'plus', label: 'Shopify Plus', rate: 0 },
];

export default function SettingsPage({ store, onBack }: SettingsPageProps) {
  const [settings, setSettings] = useState<StoreSettings>({
    default_cogs_percentage: 30,
    default_shipping_cost: 0,
    payment_processing_rate: 0.029,
    payment_processing_fixed: 0.30,
    shopify_plan: 'basic',
    shopify_fee_rate: 0.02,
    include_taxes_in_revenue: false,
    include_shipping_in_revenue: true,
    email_daily_digest: true,
    email_weekly_summary: true,
    email_profit_alerts: true,
    email_alert_threshold: 0,
    profit_goal_daily: undefined,
    profit_goal_monthly: undefined,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toasts, removeToast, showSuccess, showError, showInfo } = useToast();
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'fees' | 'expenses' | 'adspend' | 'notifications' | 'tools'>('general');
  const [hiddenFees, setHiddenFees] = useState<HiddenFee[]>([]);
  const [scanningFees, setScanningFees] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [newExpense, setNewExpense] = useState({ name: '', amount: '', frequency: 'monthly', category: 'other' });

  // Ad Spend State
  interface AdSpendEntry {
    id: string;
    platform: string;
    spend: number;
    date: string;
    campaign_name?: string;
  }
  const [adSpend, setAdSpend] = useState<AdSpendEntry[]>([]);
  const [adSpendSummary, setAdSpendSummary] = useState<{ total: number; byPlatform: Record<string, number> }>({ total: 0, byPlatform: {} });
  const [newAdSpend, setNewAdSpend] = useState({ platform: 'facebook', spend: '', date: new Date().toISOString().split('T')[0], campaign_name: '' });

  // Bundle Calculator State
  const [bundleProducts, setBundleProducts] = useState<{ name: string; price: number; cost: number; }[]>([
    { name: '', price: 0, cost: 0 },
    { name: '', price: 0, cost: 0 },
  ]);
  const [bundleDiscount, setBundleDiscount] = useState(10);

  // Break-Even Calculator State
  const [breakEvenProduct, setBreakEvenProduct] = useState({ price: 0, cost: 0, fixedCosts: 0 });

  // Cancellation state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Export state
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadSettings();
    loadExpenses();
    loadAdSpend();
  }, [store.id]);

  const loadAdSpend = async () => {
    try {
      const res = await fetch(`/api/ad-spend?store_id=${store.id}&days=30`);
      const data = await res.json();
      if (data.adSpend) {
        setAdSpend(data.adSpend);
        setAdSpendSummary(data.summary);
      }
    } catch (err) {
      console.error('Error loading ad spend:', err);
    }
  };

  const addAdSpend = async () => {
    if (!newAdSpend.spend || !newAdSpend.date) return;
    try {
      const res = await fetch('/api/ad-spend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: store.id,
          ...newAdSpend,
          spend: parseFloat(newAdSpend.spend)
        })
      });
      const data = await res.json();
      if (data.adSpend) {
        await loadAdSpend(); // Reload to get updated summary
        setNewAdSpend({ platform: 'facebook', spend: '', date: new Date().toISOString().split('T')[0], campaign_name: '' });
      }
    } catch (err) {
      console.error('Error adding ad spend:', err);
    }
  };

  const deleteAdSpend = async (id: string) => {
    try {
      await fetch(`/api/ad-spend?id=${id}`, { method: 'DELETE' });
      await loadAdSpend();
    } catch (err) {
      console.error('Error deleting ad spend:', err);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'facebook': return '📘';
      case 'google': return '🔍';
      case 'tiktok': return '🎵';
      case 'instagram': return '📸';
      case 'pinterest': return '📌';
      default: return '📊';
    }
  };

  const loadExpenses = async () => {
    try {
      const res = await fetch(`/api/expenses?store_id=${store.id}`);
      const data = await res.json();
      if (data.expenses) {
        setExpenses(data.expenses);
      }
    } catch (err) {
      console.error('Error loading expenses:', err);
    }
  };

  const addExpense = async () => {
    if (!newExpense.name || !newExpense.amount) return;
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: store.id,
          ...newExpense,
          amount: parseFloat(newExpense.amount)
        })
      });
      const data = await res.json();
      if (data.expense) {
        setExpenses([data.expense, ...expenses]);
        setNewExpense({ name: '', amount: '', frequency: 'monthly', category: 'other' });
      }
    } catch (err) {
      console.error('Error adding expense:', err);
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' });
      setExpenses(expenses.filter(e => e.id !== id));
    } catch (err) {
      console.error('Error deleting expense:', err);
    }
  };

  const getMonthlyAmount = (expense: Expense) => {
    switch (expense.frequency) {
      case 'daily': return expense.amount * 30;
      case 'weekly': return expense.amount * 4;
      case 'monthly': return expense.amount;
      case 'yearly': return expense.amount / 12;
      default: return expense.amount;
    }
  };

  const totalMonthlyExpenses = expenses.reduce((sum, e) => sum + getMonthlyAmount(e), 0);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/settings?store_id=${store.id}`);
      const data = await res.json();
      console.log('📖 Loaded settings from API:', data.settings);

      if (data.settings) {
        // Merge loaded settings, but keep defaults for null/undefined values
        const merged = { ...settings };
        for (const key of Object.keys(data.settings)) {
          if (data.settings[key] !== null && data.settings[key] !== undefined) {
            (merged as any)[key] = data.settings[key];
          }
        }
        console.log('📖 Merged settings:', merged);
        setSettings(merged);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const payload = { store_id: store.id, ...settings };
      console.log('💾 Saving settings:', payload);

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      console.log('💾 Save response:', data);

      if (!res.ok || data.error) {
        console.error('Save failed:', data.error || 'Unknown error');
        showError('Failed to save settings: ' + (data.error || 'Unknown error'));
        return;
      }

      // Update local state with saved settings from server
      if (data.settings) {
        setSettings({ ...settings, ...data.settings });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      showError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const scanForHiddenFees = async () => {
    setScanningFees(true);
    try {
      const res = await fetch(`/api/analytics/hidden-fees?store_id=${store.id}`);
      const data = await res.json();
      if (data.fees) {
        setHiddenFees(data.fees);
        if (data.fees.length === 0) {
          showSuccess('No hidden fees detected!');
        }
      } else if (data.message) {
        showInfo(data.message);
      }
    } catch (err) {
      console.error('Error scanning fees:', err);
      showError('Failed to scan. Please sync orders first.');
    } finally {
      setScanningFees(false);
    }
  };

  const handleShopifyPlanChange = (plan: string) => {
    const selectedPlan = SHOPIFY_PLANS.find(p => p.value === plan);
    setSettings({
      ...settings,
      shopify_plan: plan,
      shopify_fee_rate: selectedPlan?.rate || 0.02
    });
  };

  // Bundle Calculator
  const calculateBundleProfit = () => {
    const totalPrice = bundleProducts.reduce((sum, p) => sum + p.price, 0);
    const totalCost = bundleProducts.reduce((sum, p) => sum + p.cost, 0);
    const discountedPrice = totalPrice * (1 - bundleDiscount / 100);
    const bundleProfit = discountedPrice - totalCost;
    const individualProfit = totalPrice - totalCost;
    return {
      bundlePrice: discountedPrice,
      bundleProfit,
      individualProfit,
      savings: bundleProfit - individualProfit + (totalPrice * bundleDiscount / 100),
      margin: discountedPrice > 0 ? (bundleProfit / discountedPrice) * 100 : 0
    };
  };

  // Break-Even Calculator
  const calculateBreakEven = () => {
    const profitPerUnit = breakEvenProduct.price - breakEvenProduct.cost;
    if (profitPerUnit <= 0) return { units: Infinity, revenue: 0, profitPerUnit: 0 };
    const units = Math.ceil(breakEvenProduct.fixedCosts / profitPerUnit);
    return {
      units,
      revenue: units * breakEvenProduct.price,
      profitPerUnit
    };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const exportAllData = async () => {
    setExporting(true);
    try {
      // Fetch orders
      const ordersRes = await fetch(`/api/orders?store_id=${store.id}&limit=10000`);
      const ordersData = await ordersRes.json();

      // Fetch products
      const productsRes = await fetch(`/api/products?store_id=${store.id}`);
      const productsData = await productsRes.json();

      // Create orders CSV
      if (ordersData.orders && ordersData.orders.length > 0) {
        const orderHeaders = ['Order ID', 'Date', 'Customer', 'Revenue', 'COGS', 'Payment Fee', 'Shopify Fee', 'Shipping', 'Net Profit', 'Margin %'];
        const orderRows = ordersData.orders.map((o: any) => [
          o.shopify_order_id || o.id,
          new Date(o.created_at).toLocaleDateString(),
          o.customer_name || 'Guest',
          o.total_price || 0,
          o.total_cogs || 0,
          o.payment_fee || 0,
          o.shopify_fee || 0,
          o.shipping_cost || 0,
          o.net_profit || 0,
          o.total_price > 0 ? ((o.net_profit || 0) / o.total_price * 100).toFixed(1) : '0',
        ]);
        const ordersCsv = [orderHeaders, ...orderRows].map(row => row.join(',')).join('\n');
        downloadFile(ordersCsv, `profitpulse-orders-${new Date().toISOString().split('T')[0]}.csv`);
      }

      // Create products CSV
      if (productsData.products && productsData.products.length > 0) {
        const productHeaders = ['Product ID', 'Title', 'Variant', 'Price', 'Cost', 'Margin %', 'Units Sold', 'Total Profit'];
        const productRows = productsData.products.map((p: any) => [
          p.shopify_product_id || p.id,
          `"${(p.title || '').replace(/"/g, '""')}"`,
          `"${(p.variant_title || 'Default').replace(/"/g, '""')}"`,
          p.price || 0,
          p.cost || 0,
          p.price > 0 && p.cost ? (((p.price - p.cost) / p.price) * 100).toFixed(1) : '0',
          p.units_sold || 0,
          p.total_profit || 0,
        ]);
        const productsCsv = [productHeaders, ...productRows].map(row => row.join(',')).join('\n');
        downloadFile(productsCsv, `profitpulse-products-${new Date().toISOString().split('T')[0]}.csv`);
      }

      showSuccess('Export complete! Check your downloads.');
    } catch (err) {
      console.error('Export error:', err);
      showError('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const cancelSubscription = async () => {
    setCancelling(true);
    try {
      const res = await fetch('/api/billing/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: store.id,
          shop: store.shop_domain,
          reason: cancelReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCancelModal(false);
        showSuccess('Subscription cancelled. Access continues until billing period ends.');
        // Refresh the page to update subscription status
        window.location.reload();
      } else {
        showError('Failed to cancel: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error cancelling:', err);
      showError('Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-solid border-emerald-500 border-r-transparent mb-4"></div>
          <div className="text-white text-xl">Loading settings...</div>
        </div>
      </div>
    );
  }

  const bundleCalc = calculateBundleProfit();
  const breakEvenCalc = calculateBreakEven();

  return (
    <div className="p-6">
      <Toast toasts={toasts} removeToast={removeToast} />
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-white/60 hover:text-white transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Settings</h1>
            <p className="text-white/60 text-sm">{store.shop_domain}</p>
          </div>
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition ${
            saved
              ? 'bg-emerald-500 text-white'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Saving...
            </>
          ) : saved ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Saved!
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-white/10 pb-4 overflow-x-auto">
        {[
          { id: 'general', label: 'General', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
          { id: 'fees', label: 'Fees', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
          { id: 'expenses', label: 'Expenses', icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z' },
          { id: 'adspend', label: 'Ad Spend', icon: 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z' },
          { id: 'notifications', label: 'Alerts', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
          { id: 'tools', label: 'Profit Tools', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-emerald-600 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
            </svg>
            {tab.label}
          </button>
        ))}
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* Subscription Section */}
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Subscription</h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    store.subscription_status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : store.subscription_status === 'trial'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {store.subscription_status === 'active' ? 'Active' :
                     store.subscription_status === 'trial' ? 'Free Trial' :
                     store.subscription_status?.charAt(0).toUpperCase() + store.subscription_status?.slice(1) || 'Unknown'}
                  </span>
                  <span className="text-white font-medium">ProfitPulse Pro</span>
                </div>
                <p className="text-white/60 text-sm mt-1">
                  {store.subscription_status === 'trial' && store.trial_ends_at
                    ? `Trial ends ${new Date(store.trial_ends_at).toLocaleDateString()}`
                    : '$29.99/month • Cancel anytime'}
                </p>
              </div>
              {store.subscription_status !== 'cancelled' && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-sm font-medium transition"
                >
                  Cancel Subscription
                </button>
              )}
            </div>
          </div>

          {/* Profit Goals */}
          <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border-2 border-emerald-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Profit Goals</h3>
                <p className="text-white/60 text-sm">Set targets to track your progress</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-white/60 text-sm block mb-2">Daily Profit Goal</label>
                <div className="flex items-center gap-2">
                  <span className="text-white/60">$</span>
                  <input
                    type="number"
                    placeholder="e.g. 500"
                    value={settings.profit_goal_daily || ''}
                    onChange={(e) => setSettings({ ...settings, profit_goal_daily: parseFloat(e.target.value) || undefined })}
                    className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-white/60 text-sm block mb-2">Monthly Profit Goal</label>
                <div className="flex items-center gap-2">
                  <span className="text-white/60">$</span>
                  <input
                    type="number"
                    placeholder="e.g. 15000"
                    value={settings.profit_goal_monthly || ''}
                    onChange={(e) => setSettings({ ...settings, profit_goal_monthly: parseFloat(e.target.value) || undefined })}
                    className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
            <p className="text-white/40 text-xs mt-3">Goals will be shown on your dashboard with progress tracking</p>
          </div>

          {/* Data Sync Section */}
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Data Sync</h3>
            <p className="text-white/60 text-sm mb-4">Sync your Shopify data to ensure accurate profit calculations</p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={async () => {
                  setSaving(true);
                  try {
                    const res = await fetch('/api/products/sync', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ store_id: store.id }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      showSuccess(`Synced ${data.synced} products!`);
                    } else {
                      showError('Failed to sync products: ' + (data.error || 'Unknown error'));
                    }
                  } catch (error) {
                    showError('Failed to sync products');
                  }
                  setSaving(false);
                }}
                disabled={saving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {saving ? '⏳' : '📦'} Sync Products
              </button>
              <button
                onClick={async () => {
                  setSaving(true);
                  try {
                    const res = await fetch('/api/orders/sync', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ store_id: store.id }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      showSuccess(`Synced ${data.synced} orders!`);
                    } else {
                      showError('Failed to sync orders: ' + (data.error || 'Unknown error'));
                    }
                  } catch (error) {
                    showError('Failed to sync orders');
                  }
                  setSaving(false);
                }}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {saving ? '⏳' : '🛒'} Sync Orders
              </button>
            </div>
            <p className="text-white/40 text-xs mt-3">Last sync pulls recent data from Shopify. Orders include line items for product profitability.</p>
          </div>

          {/* Export Data Section */}
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Export Data</h3>
            <p className="text-white/60 text-sm mb-4">Download your orders and products as CSV files</p>
            <button
              onClick={exportAllData}
              disabled={exporting}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {exporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export All Data (CSV)
                </>
              )}
            </button>
            <p className="text-white/40 text-xs mt-3">Downloads both orders and products. You own your data.</p>
          </div>

          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Default COGS Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-white/60 text-sm block mb-2">Default COGS %</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={settings.default_cogs_percentage}
                    onChange={(e) => setSettings({ ...settings, default_cogs_percentage: parseFloat(e.target.value) })}
                    className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-white/60">%</span>
                </div>
                <p className="text-white/40 text-xs mt-1">Applied to products without specific COGS</p>
              </div>
              <div>
                <label className="text-white/60 text-sm block mb-2">Default Shipping Cost</label>
                <div className="flex items-center gap-2">
                  <span className="text-white/60">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={settings.default_shipping_cost}
                    onChange={(e) => setSettings({ ...settings, default_shipping_cost: parseFloat(e.target.value) })}
                    className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <p className="text-white/40 text-xs mt-1">Per-order shipping cost to fulfill</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Revenue Calculation</h3>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.include_taxes_in_revenue}
                  onChange={(e) => setSettings({ ...settings, include_taxes_in_revenue: e.target.checked })}
                  className="w-5 h-5 rounded border-white/20 bg-white/10 text-emerald-500 focus:ring-emerald-500"
                />
                <div>
                  <span className="text-white">Include taxes in revenue</span>
                  <p className="text-white/40 text-sm">Count collected taxes as part of your revenue</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.include_shipping_in_revenue}
                  onChange={(e) => setSettings({ ...settings, include_shipping_in_revenue: e.target.checked })}
                  className="w-5 h-5 rounded border-white/20 bg-white/10 text-emerald-500 focus:ring-emerald-500"
                />
                <div>
                  <span className="text-white">Include shipping charges in revenue</span>
                  <p className="text-white/40 text-sm">Count shipping charges collected from customers</p>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Fee Settings */}
      {activeTab === 'fees' && (
        <div className="space-y-6">
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Payment Processing Fees</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-white/60 text-sm block mb-2">Processing Rate</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    value={(settings.payment_processing_rate * 100).toFixed(1)}
                    onChange={(e) => setSettings({ ...settings, payment_processing_rate: parseFloat(e.target.value) / 100 })}
                    className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-white/60">%</span>
                </div>
                <p className="text-white/40 text-xs mt-1">e.g. 2.9 for Shopify Payments</p>
              </div>
              <div>
                <label className="text-white/60 text-sm block mb-2">Fixed Fee per Transaction</label>
                <div className="flex items-center gap-2">
                  <span className="text-white/60">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={settings.payment_processing_fixed}
                    onChange={(e) => setSettings({ ...settings, payment_processing_fixed: parseFloat(e.target.value) })}
                    className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <p className="text-white/40 text-xs mt-1">e.g. $0.30 for Shopify Payments</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Shopify Plan & Transaction Fees</h3>
            <div>
              <label className="text-white/60 text-sm block mb-2">Your Shopify Plan</label>
              <select
                value={settings.shopify_plan}
                onChange={(e) => handleShopifyPlanChange(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              >
                {SHOPIFY_PLANS.map((plan) => (
                  <option key={plan.value} value={plan.value}>
                    {plan.label} ({(plan.rate * 100).toFixed(1)}% transaction fee)
                  </option>
                ))}
              </select>
              <p className="text-white/40 text-xs mt-2">
                Transaction fee: {(settings.shopify_fee_rate * 100).toFixed(1)}% on orders not using Shopify Payments
              </p>
            </div>
          </div>

          {/* Hidden Fee Finder */}
          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-2 border-amber-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Hidden Fee Finder</h3>
                  <p className="text-white/60 text-sm">Scan for fees eating into your profit</p>
                </div>
              </div>
              <button
                onClick={scanForHiddenFees}
                disabled={scanningFees}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition"
              >
                {scanningFees ? 'Scanning...' : 'Scan Now'}
              </button>
            </div>

            {hiddenFees.length > 0 && (
              <div className="space-y-3 mt-4">
                {hiddenFees.map((fee, i) => (
                  <div key={i} className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-white font-medium">{fee.description}</div>
                        <div className="text-white/60 text-sm mt-1">{fee.recommendation}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-red-400 font-bold">{formatCurrency(fee.amount)}</div>
                        <div className="text-emerald-400 text-sm">Save {formatCurrency(fee.potential_savings)}</div>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-300 font-medium">Total Potential Savings</span>
                    <span className="text-emerald-400 font-bold text-xl">
                      {formatCurrency(hiddenFees.reduce((sum, f) => sum + f.potential_savings, 0))}/month
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expenses */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">
          {/* Monthly Summary */}
          <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border-2 border-red-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Monthly Operating Expenses</h3>
                <p className="text-white/60 text-sm">Track your recurring costs to see true profit</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-red-400">{formatCurrency(totalMonthlyExpenses)}</div>
                <div className="text-white/60 text-sm">/month</div>
              </div>
            </div>
          </div>

          {/* Add Expense */}
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Add Expense</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2">
                <input
                  type="text"
                  placeholder="Expense name"
                  value={newExpense.name}
                  onChange={(e) => setNewExpense({ ...newExpense, name: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <div className="flex items-center">
                  <span className="text-white/60 mr-2">$</span>
                  <input
                    type="number"
                    placeholder="Amount"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div>
                <select
                  value={newExpense.frequency}
                  onChange={(e) => setNewExpense({ ...newExpense, frequency: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="daily">Daily</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <button
                  onClick={addExpense}
                  disabled={!newExpense.name || !newExpense.amount}
                  className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white rounded-lg font-medium transition"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Expense List */}
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Your Expenses</h3>
            {expenses.length === 0 ? (
              <div className="text-center py-8 text-white/40">
                <p>No expenses tracked yet.</p>
                <p className="text-sm mt-1">Add your Shopify subscription, app fees, and other costs above.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {expenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div>
                      <div className="text-white font-medium">{expense.name}</div>
                      <div className="text-white/40 text-sm capitalize">{expense.frequency}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-white font-medium">{formatCurrency(expense.amount)}</div>
                        <div className="text-white/40 text-sm">{formatCurrency(getMonthlyAmount(expense))}/mo</div>
                      </div>
                      <button
                        onClick={() => deleteExpense(expense.id)}
                        className="text-red-400 hover:text-red-300 transition"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Common Expenses Quick Add */}
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Quick Add Common Expenses</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { name: 'Shopify Basic', amount: 39, icon: '🛍️' },
                { name: 'Shopify Standard', amount: 105, icon: '🛍️' },
                { name: 'Klaviyo', amount: 45, icon: '📧' },
                { name: 'Shipping Insurance', amount: 50, icon: '📦' },
              ].map((item) => (
                <button
                  key={item.name}
                  onClick={() => {
                    setNewExpense({ name: item.name, amount: item.amount.toString(), frequency: 'monthly', category: 'apps' });
                  }}
                  className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-left transition"
                >
                  <div className="text-2xl mb-1">{item.icon}</div>
                  <div className="text-white text-sm font-medium">{item.name}</div>
                  <div className="text-white/60 text-xs">{formatCurrency(item.amount)}/mo</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Ad Spend */}
      {activeTab === 'adspend' && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-2 border-blue-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Ad Spend (Last 30 Days)</h3>
                <p className="text-white/60 text-sm">Track your advertising costs to see true profit</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-400">{formatCurrency(adSpendSummary.total)}</div>
                <div className="text-white/60 text-sm">total ad spend</div>
              </div>
            </div>
            {Object.keys(adSpendSummary.byPlatform).length > 0 && (
              <div className="flex gap-4 mt-4 pt-4 border-t border-white/10">
                {Object.entries(adSpendSummary.byPlatform).map(([platform, amount]) => (
                  <div key={platform} className="flex items-center gap-2">
                    <span className="text-xl">{getPlatformIcon(platform)}</span>
                    <span className="text-white/60 capitalize">{platform}:</span>
                    <span className="text-white font-medium">{formatCurrency(amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Ad Spend */}
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Add Ad Spend</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <select
                  value={newAdSpend.platform}
                  onChange={(e) => setNewAdSpend({ ...newAdSpend, platform: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="facebook">Facebook</option>
                  <option value="google">Google</option>
                  <option value="tiktok">TikTok</option>
                  <option value="instagram">Instagram</option>
                  <option value="pinterest">Pinterest</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <div className="flex items-center">
                  <span className="text-white/60 mr-2">$</span>
                  <input
                    type="number"
                    placeholder="Amount"
                    value={newAdSpend.spend}
                    onChange={(e) => setNewAdSpend({ ...newAdSpend, spend: e.target.value })}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div>
                <input
                  type="date"
                  value={newAdSpend.date}
                  onChange={(e) => setNewAdSpend({ ...newAdSpend, date: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Campaign (optional)"
                  value={newAdSpend.campaign_name}
                  onChange={(e) => setNewAdSpend({ ...newAdSpend, campaign_name: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <button
                  onClick={addAdSpend}
                  disabled={!newAdSpend.spend}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg font-medium transition"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Ad Spend History */}
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Recent Ad Spend</h3>
            {adSpend.length === 0 ? (
              <div className="text-center py-8 text-white/40">
                <p>No ad spend tracked yet.</p>
                <p className="text-sm mt-1">Add your Facebook, Google, TikTok ad spend above to see true profit.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {adSpend.slice(0, 20).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{getPlatformIcon(entry.platform)}</span>
                      <div>
                        <div className="text-white font-medium capitalize">{entry.platform}</div>
                        <div className="text-white/40 text-sm">
                          {new Date(entry.date).toLocaleDateString()}
                          {entry.campaign_name && ` • ${entry.campaign_name}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-white font-medium">{formatCurrency(entry.spend)}</div>
                      <button
                        onClick={() => deleteAdSpend(entry.id)}
                        className="text-red-400 hover:text-red-300 transition"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ROAS Calculator */}
          <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border-2 border-emerald-500/30 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-2">ROAS Calculator</h3>
            <p className="text-white/60 text-sm mb-4">
              Based on your ad spend and revenue, here's your Return on Ad Spend
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-white/60 text-sm">Total Ad Spend</div>
                <div className="text-xl font-bold text-red-400">{formatCurrency(adSpendSummary.total)}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-white/60 text-sm">ROAS</div>
                <div className="text-xl font-bold text-emerald-400">
                  {adSpendSummary.total > 0 ? '—' : '—'}x
                </div>
                <div className="text-white/40 text-xs">Sync orders to calculate</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-white/60 text-sm">Profit After Ads</div>
                <div className="text-xl font-bold text-white">—</div>
                <div className="text-white/40 text-xs">Sync orders to calculate</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          {/* Email Address */}
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Notification Email</h3>
            <p className="text-white/60 text-sm mb-3">Alerts and digests will be sent to this email address</p>
            <div className="flex items-center gap-3">
              <input
                type="email"
                placeholder="your@email.com"
                value={settings.notification_email || store.email || ''}
                onChange={(e) => setSettings({ ...settings, notification_email: e.target.value })}
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <p className="text-white/40 text-xs mt-2">
              {store.email ? `Shopify store email: ${store.email}` : 'Enter your email to receive profit alerts and digests'}
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Email Notifications</h3>
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-white font-medium">Daily Profit Digest</span>
                    <p className="text-white/40 text-sm">Get yesterday's profit summary every morning</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.email_daily_digest}
                  onChange={(e) => setSettings({ ...settings, email_daily_digest: e.target.checked })}
                  className="w-5 h-5 rounded border-white/20 bg-white/10 text-emerald-500 focus:ring-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-white font-medium">Weekly Summary</span>
                    <p className="text-white/40 text-sm">Weekly profit report with trends and insights</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.email_weekly_summary}
                  onChange={(e) => setSettings({ ...settings, email_weekly_summary: e.target.checked })}
                  className="w-5 h-5 rounded border-white/20 bg-white/10 text-emerald-500 focus:ring-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-white font-medium">Profit Alerts</span>
                    <p className="text-white/40 text-sm">Get notified when an order is unprofitable</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.email_profit_alerts}
                  onChange={(e) => setSettings({ ...settings, email_profit_alerts: e.target.checked })}
                  className="w-5 h-5 rounded border-white/20 bg-white/10 text-emerald-500 focus:ring-emerald-500"
                />
              </label>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Slack Integration</h3>
            <div>
              <label className="text-white/60 text-sm block mb-2">Webhook URL (optional)</label>
              <input
                type="text"
                placeholder="https://hooks.slack.com/services/..."
                value={settings.slack_webhook_url || ''}
                onChange={(e) => setSettings({ ...settings, slack_webhook_url: e.target.value })}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-emerald-500"
              />
              <p className="text-white/40 text-xs mt-1">Receive profit alerts in Slack</p>
            </div>
          </div>
        </div>
      )}

      {/* Profit Tools */}
      {activeTab === 'tools' && (
        <div className="space-y-6">
          {/* Bundle Calculator */}
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-cyan-500/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Bundle Profit Calculator</h3>
                <p className="text-white/60 text-sm">See if bundling products is profitable</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                {bundleProducts.map((product, index) => (
                  <div key={index} className="bg-white/5 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white/60 text-sm">Product {index + 1}</span>
                      {bundleProducts.length > 2 && (
                        <button
                          onClick={() => setBundleProducts(bundleProducts.filter((_, i) => i !== index))}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Name"
                        value={product.name}
                        onChange={(e) => {
                          const updated = [...bundleProducts];
                          updated[index].name = e.target.value;
                          setBundleProducts(updated);
                        }}
                        className="px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:border-emerald-500 placeholder-white/30"
                      />
                      <input
                        type="number"
                        placeholder="Price"
                        value={product.price || ''}
                        onChange={(e) => {
                          const updated = [...bundleProducts];
                          updated[index].price = parseFloat(e.target.value) || 0;
                          setBundleProducts(updated);
                        }}
                        className="px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:border-emerald-500 placeholder-white/30"
                      />
                      <input
                        type="number"
                        placeholder="Cost"
                        value={product.cost || ''}
                        onChange={(e) => {
                          const updated = [...bundleProducts];
                          updated[index].cost = parseFloat(e.target.value) || 0;
                          setBundleProducts(updated);
                        }}
                        className="px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:border-emerald-500 placeholder-white/30"
                      />
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => setBundleProducts([...bundleProducts, { name: '', price: 0, cost: 0 }])}
                  className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 text-white/60 hover:text-white rounded-lg text-sm transition"
                >
                  + Add Product
                </button>
                <div>
                  <label className="text-white/60 text-sm block mb-2">Bundle Discount</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={bundleDiscount}
                      onChange={(e) => setBundleDiscount(parseFloat(e.target.value) || 0)}
                      className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-white/60">%</span>
                  </div>
                </div>
              </div>

              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
                <h4 className="text-cyan-400 font-medium mb-4">Bundle Analysis</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-white/60">Bundle Price</span>
                    <span className="text-white font-medium">{formatCurrency(bundleCalc.bundlePrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Bundle Profit</span>
                    <span className={`font-medium ${bundleCalc.bundleProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatCurrency(bundleCalc.bundleProfit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Margin</span>
                    <span className={`font-medium ${bundleCalc.margin >= 20 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {bundleCalc.margin.toFixed(1)}%
                    </span>
                  </div>
                  <div className="border-t border-white/10 pt-3">
                    <div className="flex justify-between">
                      <span className="text-white/60">vs. Individual Sales</span>
                      <span className={`font-medium ${bundleCalc.bundleProfit >= bundleCalc.individualProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                        {bundleCalc.bundleProfit >= bundleCalc.individualProfit ? '+' : ''}{formatCurrency(bundleCalc.bundleProfit - bundleCalc.individualProfit)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Break-Even Calculator */}
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Break-Even Calculator</h3>
                <p className="text-white/60 text-sm">How many units to cover your costs</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-white/60 text-sm block mb-2">Selling Price</label>
                  <div className="flex items-center gap-2">
                    <span className="text-white/60">$</span>
                    <input
                      type="number"
                      value={breakEvenProduct.price || ''}
                      onChange={(e) => setBreakEvenProduct({ ...breakEvenProduct, price: parseFloat(e.target.value) || 0 })}
                      className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-white/60 text-sm block mb-2">Cost per Unit (COGS + Shipping)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-white/60">$</span>
                    <input
                      type="number"
                      value={breakEvenProduct.cost || ''}
                      onChange={(e) => setBreakEvenProduct({ ...breakEvenProduct, cost: parseFloat(e.target.value) || 0 })}
                      className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-white/60 text-sm block mb-2">Fixed Costs to Cover (Ad spend, etc.)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-white/60">$</span>
                    <input
                      type="number"
                      value={breakEvenProduct.fixedCosts || ''}
                      onChange={(e) => setBreakEvenProduct({ ...breakEvenProduct, fixedCosts: parseFloat(e.target.value) || 0 })}
                      className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                <h4 className="text-purple-400 font-medium mb-4">Break-Even Point</h4>
                {breakEvenCalc.units === Infinity ? (
                  <div className="text-red-400">
                    Cost per unit exceeds selling price - not profitable!
                  </div>
                ) : breakEvenProduct.fixedCosts === 0 ? (
                  <div className="text-white/60">
                    Enter your fixed costs to calculate break-even point
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-white/60">Profit per Unit</span>
                      <span className="text-emerald-400 font-medium">{formatCurrency(breakEvenCalc.profitPerUnit)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">Units to Break Even</span>
                      <span className="text-3xl font-bold text-white">{breakEvenCalc.units}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Revenue Needed</span>
                      <span className="text-white font-medium">{formatCurrency(breakEvenCalc.revenue)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Support Footer */}
      <div className="mt-8 pt-6 border-t border-white/10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <p className="text-white/60 text-sm">
              Need help? Contact us at{' '}
              <a href="mailto:adam@argora.ai" className="text-emerald-400 hover:text-emerald-300 underline">
                adam@argora.ai
              </a>
            </p>
            <p className="text-white/40 text-xs mt-1">We typically respond within 24 hours</p>
          </div>
          <a
            href="/faq"
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white rounded-lg text-sm font-medium transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            View FAQ
          </a>
        </div>
      </div>

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-white/10 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-2">Cancel Subscription?</h3>
            <p className="text-white/60 text-sm mb-4">
              We're sorry to see you go. Your subscription will remain active until the end of your current billing period.
            </p>

            <div className="mb-4">
              <label className="text-white/60 text-sm block mb-2">Help us improve - why are you cancelling?</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">Select a reason (optional)</option>
                <option value="too_expensive">Too expensive</option>
                <option value="not_using">Not using it enough</option>
                <option value="missing_features">Missing features I need</option>
                <option value="switching">Switching to another app</option>
                <option value="closing_store">Closing my store</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition"
              >
                Keep Subscription
              </button>
              <button
                onClick={cancelSubscription}
                disabled={cancelling}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white rounded-lg font-medium transition"
              >
                {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>

            <p className="text-white/40 text-xs mt-4 text-center">
              Questions? Email us at adam@argora.ai
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
