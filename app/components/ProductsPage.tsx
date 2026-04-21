'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { Toast, useToast } from './Toast';
import { createAuthenticatedFetch } from '@/lib/authenticated-fetch';

interface Store {
  id: string;
  store_name: string;
  shop_domain: string;
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
  // Calculated fields from orders
  total_sold?: number;
  total_revenue?: number;
  total_profit?: number;
  profit_margin?: number;
  profit_score?: number;
}

interface ProductsPageProps {
  store: Store;
  onBack: () => void;
}

export default function ProductsPage({ store, onBack }: ProductsPageProps) {
  const authFetch = useMemo(() => createAuthenticatedFetch(store.shop_domain), [store.shop_domain]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'profit_score' | 'profit_margin' | 'total_sold'>('profit_score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [bulkCogs, setBulkCogs] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditCosts, setBulkEditCosts] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toasts, removeToast, showSuccess, showError } = useToast();

  useEffect(() => {
    loadProducts();
  }, [store.id]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/products?store_id=${store.id}`);
      const data = await res.json();
      if (data.products) {
        // Calculate profit scores
        const productsWithScores = data.products.map((p: Product) => ({
          ...p,
          profit_score: calculateProfitScore(p)
        }));
        setProducts(productsWithScores);
      }
    } catch (err) {
      console.error('Error loading products:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateProfitScore = (product: Product): number => {
    // Profit Score algorithm (0-100)
    // Factors: margin %, sales velocity, profitability
    const margin = product.profit_margin || 0;
    const totalSold = product.total_sold || 0;
    const totalProfit = product.total_profit || 0;

    // Margin score (0-40 points) - 40% margin = 40 points
    const marginScore = Math.min(margin, 40);

    // Velocity score (0-30 points) - based on units sold
    const velocityScore = Math.min(totalSold / 10, 30);

    // Profit contribution score (0-30 points)
    const profitScore = totalProfit > 0 ? Math.min(totalProfit / 100, 30) : 0;

    return Math.round(marginScore + velocityScore + profitScore);
  };

  const getProfitScoreColor = (score: number): string => {
    if (score >= 70) return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
    if (score >= 40) return 'text-amber-400 bg-amber-500/20 border-amber-500/30';
    return 'text-red-400 bg-red-500/20 border-red-500/30';
  };

  const getProfitScoreLabel = (score: number): string => {
    if (score >= 70) return 'Excellent';
    if (score >= 40) return 'Average';
    return 'Poor';
  };

  const syncProducts = async () => {
    setSyncing(true);
    try {
      const res = await authFetch('/api/products/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: store.id })
      });
      const data = await res.json();
      if (data.success) {
        await loadProducts();
      }
    } catch (err) {
      console.error('Error syncing products:', err);
    } finally {
      setSyncing(false);
    }
  };

  const updateProductCost = async (productId: string, field: string, value: number) => {
    setSaving(true);
    try {
      await authFetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      setProducts(products.map(p =>
        p.id === productId ? { ...p, [field]: value } : p
      ));
    } catch (err) {
      console.error('Error updating product:', err);
    } finally {
      setSaving(false);
      setEditingProduct(null);
    }
  };

  const applyBulkCogs = async (type: 'percentage' | 'fixed', value: number) => {
    setSaving(true);
    try {
      await authFetch('/api/products/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: store.id,
          type,
          value
        })
      });
      await loadProducts();
      // Re-sync orders to recalculate profits with new COGS
      await authFetch('/api/orders/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: store.id })
      });
      setShowBulkModal(false);
      setBulkCogs('');
      showSuccess('COGS updated and profits recalculated!');
    } catch (err) {
      console.error('Error applying bulk COGS:', err);
    } finally {
      setSaving(false);
    }
  };

  const openBulkEditModal = () => {
    // Initialize bulk edit costs with current values
    const costs: Record<string, string> = {};
    products.forEach(p => {
      costs[p.id] = (p.cost_per_item || 0).toFixed(2);
    });
    setBulkEditCosts(costs);
    setShowBulkEditModal(true);
  };

  const saveBulkEditCosts = async () => {
    setSaving(true);
    try {
      // Update each product that changed
      const updates = Object.entries(bulkEditCosts).map(([id, cost]) => {
        const product = products.find(p => p.id === id);
        const newCost = parseFloat(cost) || 0;
        if (product && product.cost_per_item !== newCost) {
          return authFetch(`/api/products/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cost_per_item: newCost })
          });
        }
        return null;
      }).filter(Boolean);

      await Promise.all(updates);
      await loadProducts();

      // Re-sync orders to recalculate profits
      await authFetch('/api/orders/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: store.id })
      });

      setShowBulkEditModal(false);
      showSuccess('COGS updated and profits recalculated!');
    } catch (err) {
      console.error('Error saving bulk costs:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const csv = event.target?.result as string;
      const lines = csv.split('\n');
      const updates: { sku: string; cost: number }[] = [];

      // Skip header row
      for (let i = 1; i < lines.length; i++) {
        const [sku, cost] = lines[i].split(',');
        if (sku && cost) {
          updates.push({ sku: sku.trim(), cost: parseFloat(cost.trim()) });
        }
      }

      try {
        const res = await authFetch('/api/products/import-csv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ store_id: store.id, updates })
        });
        const data = await res.json();
        await loadProducts();
        setShowImportModal(false);
        if (data.updated > 0) {
          showSuccess(`Imported! ${data.updated} products updated${data.notFound > 0 ? `, ${data.notFound} SKUs not found` : ''}`);
        } else {
          showError('No products updated. Make sure SKUs match your products.');
        }
      } catch (err) {
        console.error('Error importing CSV:', err);
        showError('Failed to import CSV');
      }
    };
    reader.readAsText(file);
  };

  const downloadCSVTemplate = () => {
    // Generate CSV with current products
    const csvContent = 'sku,cost\n' + products
      .filter(p => p.sku)
      .map(p => `${p.sku},${p.cost_per_item || 0}`)
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'profitpulse-cogs-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredProducts = products
    .filter(p => p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 p.sku?.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      const aVal = a[sortBy] || 0;
      const bVal = b[sortBy] || 0;
      return sortOrder === 'desc' ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number);
    });

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-solid border-emerald-500 border-r-transparent mb-4"></div>
          <div className="text-white text-xl">Loading products...</div>
        </div>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-white">Products</h1>
            <p className="text-white/60 text-sm">{products.length} products with COGS tracking</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-xs sm:text-sm font-medium transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import CSV
          </button>
          <button
            onClick={openBulkEditModal}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm font-medium transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit All Costs
          </button>
          <button
            onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm font-medium transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Set % COGS
          </button>
          <button
            onClick={syncProducts}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white rounded-lg text-sm font-medium transition"
          >
            {syncing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Syncing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync from Shopify
              </>
            )}
          </button>
        </div>
      </div>

      {/* Search and Sort */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="profit_score">Profit Score</option>
          <option value="profit_margin">Margin %</option>
          <option value="total_sold">Units Sold</option>
          <option value="title">Name</option>
        </select>
        <button
          onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
          className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition"
        >
          {sortOrder === 'desc' ? '↓' : '↑'}
        </button>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Products Yet</h3>
          <p className="text-white/60 mb-6">Sync your products from Shopify to start tracking COGS and profit.</p>
          <button
            onClick={syncProducts}
            disabled={syncing}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition"
          >
            {syncing ? 'Syncing...' : 'Sync Products from Shopify'}
          </button>
        </div>
      ) : (
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-6 py-4 text-white/60 text-sm font-medium">Product</th>
                <th className="text-center px-4 py-4 text-white/60 text-sm font-medium">Profit Score</th>
                <th className="text-right px-4 py-4 text-white/60 text-sm font-medium">Cost (COGS)</th>
                <th className="text-right px-4 py-4 text-white/60 text-sm font-medium">Shipping</th>
                <th className="text-right px-4 py-4 text-white/60 text-sm font-medium">Sold</th>
                <th className="text-right px-4 py-4 text-white/60 text-sm font-medium">Revenue</th>
                <th className="text-right px-4 py-4 text-white/60 text-sm font-medium">Profit</th>
                <th className="text-right px-6 py-4 text-white/60 text-sm font-medium">Margin</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map((product) => (
                <tr key={product.id} className="border-b border-white/5 hover:bg-white/5 transition">
                  <td className="px-6 py-4">
                    <div className="text-white font-medium">{product.title}</div>
                    <div className="text-white/40 text-sm">{product.sku || 'No SKU'}</div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold border ${getProfitScoreColor(product.profit_score || 0)}`}>
                      {product.profit_score || 0}
                      <span className="text-xs font-normal opacity-75">{getProfitScoreLabel(product.profit_score || 0)}</span>
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    {editingProduct === product.id ? (
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={product.cost_per_item}
                        onBlur={(e) => updateProductCost(product.id, 'cost_per_item', parseFloat(e.target.value))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updateProductCost(product.id, 'cost_per_item', parseFloat((e.target as HTMLInputElement).value));
                          }
                        }}
                        className="w-24 px-2 py-1 bg-white/10 border border-emerald-500 rounded text-white text-right focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <button
                        onClick={() => setEditingProduct(product.id)}
                        className="text-white hover:text-emerald-400 transition"
                      >
                        {formatCurrency(product.cost_per_item || 0)}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right text-white/60">
                    {formatCurrency(product.shipping_cost || 0)}
                  </td>
                  <td className="px-4 py-4 text-right text-white">
                    {product.total_sold || 0}
                  </td>
                  <td className="px-4 py-4 text-right text-white">
                    {formatCurrency(product.total_revenue || 0)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className={product.total_profit && product.total_profit >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {formatCurrency(product.total_profit || 0)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`font-medium ${
                      (product.profit_margin || 0) >= 30 ? 'text-emerald-400' :
                      (product.profit_margin || 0) >= 15 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {(product.profit_margin || 0).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-white/10">
              <div className="text-white/60 text-sm">
                Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredProducts.length)} of {filteredProducts.length} products
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                  .map((page, idx, arr) => (
                    <span key={page}>
                      {idx > 0 && arr[idx - 1] !== page - 1 && <span className="text-white/40 px-1">...</span>}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`w-10 h-10 rounded-lg font-medium transition ${
                          currentPage === page
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                      >
                        {page}
                      </button>
                    </span>
                  ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bulk COGS Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-white/20 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Bulk Set COGS</h3>
            <p className="text-white/60 mb-6">Set a default cost for all products at once.</p>

            <div className="space-y-4">
              <div>
                <label className="text-white/60 text-sm block mb-2">Set as % of price</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="e.g. 40"
                    value={bulkCogs}
                    onChange={(e) => setBulkCogs(e.target.value)}
                    className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                  <span className="px-4 py-2 text-white/60">%</span>
                </div>
                <p className="text-white/40 text-xs mt-1">e.g. 40% means COGS = 40% of selling price</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => applyBulkCogs('percentage', parseFloat(bulkCogs))}
                  disabled={!bulkCogs || saving}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white rounded-lg font-medium transition"
                >
                  {saving ? 'Applying...' : 'Apply to All'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-white/20 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Import COGS from CSV</h3>
            <p className="text-white/60 mb-6">Upload a CSV with SKU and cost columns to bulk update your product costs.</p>

            <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4">
              <p className="text-white/60 text-sm mb-2">CSV Format:</p>
              <code className="text-emerald-400 text-sm">
                sku,cost<br/>
                ABC123,12.50<br/>
                DEF456,8.99
              </code>
            </div>

            <button
              onClick={downloadCSVTemplate}
              className="w-full mb-4 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/20 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Template (with your SKUs)
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              className="hidden"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowImportModal(false)}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition"
              >
                Upload CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Edit Costs Modal */}
      {showBulkEditModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-white/20 rounded-xl p-6 max-w-4xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">Edit Product Costs</h3>
                <p className="text-white/60 text-sm">Set the cost (COGS) for each product. Press Tab to move between fields.</p>
              </div>
              <button
                onClick={() => setShowBulkEditModal(false)}
                className="text-white/60 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-slate-800">
                  <tr className="border-b border-white/10">
                    <th className="text-left px-4 py-3 text-white/60 text-sm font-medium">Product</th>
                    <th className="text-left px-4 py-3 text-white/60 text-sm font-medium">SKU</th>
                    <th className="text-right px-4 py-3 text-white/60 text-sm font-medium w-32">Cost ($)</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product, idx) => (
                    <tr key={product.id} className="border-b border-white/5">
                      <td className="px-4 py-2">
                        <div className="text-white text-sm">{product.title}</div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="text-white/60 text-sm">{product.sku || '-'}</div>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={bulkEditCosts[product.id] || ''}
                          onChange={(e) => setBulkEditCosts({
                            ...bulkEditCosts,
                            [product.id]: e.target.value
                          })}
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-right focus:outline-none focus:border-emerald-500"
                          placeholder="0.00"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3 pt-4 border-t border-white/10 mt-4">
              <button
                onClick={() => setShowBulkEditModal(false)}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={saveBulkEditCosts}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white rounded-lg font-medium transition"
              >
                {saving ? 'Saving & Recalculating...' : 'Save All & Recalculate Profits'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
