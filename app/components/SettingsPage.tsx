'use client';

import { useEffect, useState } from 'react';

interface Settings {
  id: string;
  store_id: string;
  default_cogs_percentage: number;
  default_shipping_cost: number;
  payment_processing_rate: number;
  payment_processing_fixed: number;
  shopify_plan: string;
  shopify_fee_rate: number;
  include_taxes_in_revenue: boolean;
  include_shipping_in_revenue: boolean;
}

interface Product {
  id: string;
  shopify_product_id: string;
  shopify_variant_id: string;
  title: string;
  sku: string;
  cost_per_item: number;
  shipping_cost: number;
  handling_cost: number;
}

const SHOPIFY_PLANS = [
  { value: 'basic', label: 'Basic Shopify', rate: 0.02 },
  { value: 'shopify', label: 'Shopify', rate: 0.01 },
  { value: 'advanced', label: 'Advanced', rate: 0.005 },
  { value: 'plus', label: 'Shopify Plus', rate: 0.0015 },
];

export default function SettingsPage({ storeId }: { storeId: string }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'products'>('general');

  useEffect(() => {
    loadData();
  }, [storeId]);

  async function loadData() {
    setLoading(true);
    try {
      const [settingsRes, productsRes] = await Promise.all([
        fetch(`/api/settings?store_id=${storeId}`),
        fetch(`/api/products?store_id=${storeId}`),
      ]);

      const settingsData = await settingsRes.json();
      const productsData = await productsRes.json();

      setSettings(settingsData.settings);
      setProducts(productsData.products || []);
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, store_id: storeId }),
      });
      const data = await res.json();
      setSettings(data.settings);
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  }

  async function syncProducts() {
    setSyncing(true);
    try {
      await fetch('/api/products/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId }),
      });
      await loadData();
    } catch (err) {
      console.error('Error syncing products:', err);
    } finally {
      setSyncing(false);
    }
  }

  async function updateProductCost(product: Product, field: string, value: number) {
    try {
      await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: storeId,
          shopify_product_id: product.shopify_product_id,
          shopify_variant_id: product.shopify_variant_id,
          title: product.title,
          sku: product.sku,
          [field]: value,
        }),
      });

      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, [field]: value } : p
        )
      );
    } catch (err) {
      console.error('Error updating product:', err);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="skeleton h-8 w-48 mb-6"></div>
        <div className="card">
          <div className="skeleton h-6 w-full mb-4"></div>
          <div className="skeleton h-6 w-full mb-4"></div>
          <div className="skeleton h-6 w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('general')}
          className={`pb-3 px-1 font-medium ${
            activeTab === 'general'
              ? 'text-emerald-600 border-b-2 border-emerald-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          General Settings
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`pb-3 px-1 font-medium ${
            activeTab === 'products'
              ? 'text-emerald-600 border-b-2 border-emerald-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Product Costs
        </button>
      </div>

      {activeTab === 'general' && settings && (
        <div className="space-y-6">
          {/* Default COGS */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Default Cost Settings</h2>
            <p className="text-sm text-gray-500 mb-4">
              Used when a product doesn't have specific cost data set.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default COGS %
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={settings.default_cogs_percentage}
                    onChange={(e) =>
                      setSettings({ ...settings, default_cogs_percentage: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    min="0"
                    max="100"
                  />
                  <span className="ml-2 text-gray-500">%</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Percentage of product price</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Shipping Cost
                </label>
                <div className="flex items-center">
                  <span className="text-gray-500 mr-2">$</span>
                  <input
                    type="number"
                    value={settings.default_shipping_cost}
                    onChange={(e) =>
                      setSettings({ ...settings, default_shipping_cost: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    min="0"
                    step="0.01"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Per order</p>
              </div>
            </div>
          </div>

          {/* Shopify Plan */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Shopify Plan</h2>
            <p className="text-sm text-gray-500 mb-4">
              Used to calculate Shopify transaction fees on each order.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Shopify Plan</label>
              <select
                value={settings.shopify_plan}
                onChange={(e) => {
                  const plan = SHOPIFY_PLANS.find((p) => p.value === e.target.value);
                  setSettings({
                    ...settings,
                    shopify_plan: e.target.value,
                    shopify_fee_rate: plan?.rate || 0.02,
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {SHOPIFY_PLANS.map((plan) => (
                  <option key={plan.value} value={plan.value}>
                    {plan.label} ({(plan.rate * 100).toFixed(1)}% fee)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Payment Processing */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Payment Processing Fees</h2>
            <p className="text-sm text-gray-500 mb-4">
              Credit card processing fees (Shopify Payments, Stripe, etc.)
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Processing Rate
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={(settings.payment_processing_rate * 100).toFixed(2)}
                    onChange={(e) =>
                      setSettings({ ...settings, payment_processing_rate: parseFloat(e.target.value) / 100 || 0 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    min="0"
                    step="0.01"
                  />
                  <span className="ml-2 text-gray-500">%</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">e.g., 2.9% for most processors</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fixed Fee
                </label>
                <div className="flex items-center">
                  <span className="text-gray-500 mr-2">$</span>
                  <input
                    type="number"
                    value={settings.payment_processing_fixed}
                    onChange={(e) =>
                      setSettings({ ...settings, payment_processing_fixed: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    min="0"
                    step="0.01"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">e.g., $0.30 per transaction</p>
              </div>
            </div>
          </div>

          {/* Revenue Settings */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Revenue Calculation</h2>

            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.include_shipping_in_revenue}
                  onChange={(e) =>
                    setSettings({ ...settings, include_shipping_in_revenue: e.target.checked })
                  }
                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <span className="ml-2 text-sm text-gray-700">Include shipping in revenue</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.include_taxes_in_revenue}
                  onChange={(e) =>
                    setSettings({ ...settings, include_taxes_in_revenue: e.target.checked })
                  }
                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <span className="ml-2 text-sm text-gray-700">Include taxes in revenue</span>
              </label>
            </div>
          </div>

          <button
            onClick={saveSettings}
            disabled={saving}
            className="btn-primary w-full"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Product Costs</h2>
              <p className="text-sm text-gray-500">Set COGS for individual products</p>
            </div>
            <button
              onClick={syncProducts}
              disabled={syncing}
              className="btn-secondary"
            >
              {syncing ? 'Syncing...' : 'Sync from Shopify'}
            </button>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Cost
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Shipping
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      No products yet. Click "Sync from Shopify" to import your products.
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {product.title}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {product.sku || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <span className="text-gray-400 mr-1">$</span>
                          <input
                            type="number"
                            value={product.cost_per_item}
                            onChange={(e) =>
                              updateProductCost(product, 'cost_per_item', parseFloat(e.target.value) || 0)
                            }
                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <span className="text-gray-400 mr-1">$</span>
                          <input
                            type="number"
                            value={product.shipping_cost}
                            onChange={(e) =>
                              updateProductCost(product, 'shipping_cost', parseFloat(e.target.value) || 0)
                            }
                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
