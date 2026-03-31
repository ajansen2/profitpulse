'use client';

import { useEffect, useState, useMemo } from 'react';

interface Store {
  id: string;
  store_name: string;
  shop_domain: string;
}

interface Order {
  id: string;
  order_number: string;
  customer_email: string;
  subtotal_price: number;
  total_price: number;
  total_tax: number;
  total_shipping: number;
  total_discounts: number;
  total_cogs: number;
  payment_processing_fee: number;
  shopify_fee: number;
  gross_profit: number;
  net_profit: number;
  profit_margin: number;
  financial_status: string;
  fulfillment_status: string;
  order_created_at: string;
  line_items?: OrderLineItem[];
}

interface OrderLineItem {
  id: string;
  title: string;
  quantity: number;
  price: number;
  total_price: number;
  cost_per_item: number;
  total_cost: number;
  profit: number;
}

interface OrdersPageProps {
  store: Store;
  onBack: () => void;
}

type DateRangeOption = '7d' | '14d' | '30d' | '90d' | 'all';

export default function OrdersPage({ store, onBack }: OrdersPageProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [dateRangeOption, setDateRangeOption] = useState<DateRangeOption>('90d');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'profitable' | 'unprofitable'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const dateRange = useMemo(() => {
    const days = dateRangeOption === '7d' ? 7 : dateRangeOption === '14d' ? 14 : dateRangeOption === '30d' ? 30 : dateRangeOption === '90d' ? 90 : null;
    return { days, label: dateRangeOption === 'all' ? 'All time' : `Last ${days} days` };
  }, [dateRangeOption]);

  useEffect(() => {
    loadOrders();
  }, [store.id, dateRange.days]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const url = dateRange.days
        ? `/api/orders?store_id=${store.id}&days=${dateRange.days}`
        : `/api/orders?store_id=${store.id}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.orders) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);

  const syncOrders = async () => {
    setSyncing(true);
    setSyncError(null);
    setSyncSuccess(null);
    try {
      console.log('📦 Starting order sync for store:', store.id);
      const res = await fetch('/api/orders/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: store.id })
      });
      const data = await res.json();
      console.log('📦 Sync response:', data);
      if (data.success) {
        setSyncSuccess(`Synced ${data.synced} orders successfully!`);
        await loadOrders();
      } else {
        console.error('Sync failed:', data);
        let errorMsg = data.error || 'Sync failed';
        if (data.details) {
          errorMsg += ` - ${data.details}`;
        }
        if (data.status) {
          errorMsg += ` (Status: ${data.status})`;
        }
        if (data.needsReauth) {
          errorMsg = 'Access token expired. Please reinstall the app from Shopify.';
        }
        setSyncError(errorMsg);
      }
    } catch (err) {
      console.error('Error syncing orders:', err);
      setSyncError('Network error - check console');
    } finally {
      setSyncing(false);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders
      .filter(order => {
        const matchesSearch = order.order_number?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterStatus === 'all' ||
                             (filterStatus === 'profitable' && order.net_profit >= 0) ||
                             (filterStatus === 'unprofitable' && order.net_profit < 0);
        return matchesSearch && matchesFilter;
      });
  }, [orders, searchTerm, filterStatus]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, currentPage]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  const stats = useMemo(() => {
    const profitable = filteredOrders.filter(o => o.net_profit >= 0).length;
    const unprofitable = filteredOrders.filter(o => o.net_profit < 0).length;
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.total_price || 0), 0);
    const totalProfit = filteredOrders.reduce((sum, o) => sum + (o.net_profit || 0), 0);
    const avgMargin = filteredOrders.length > 0
      ? filteredOrders.reduce((sum, o) => sum + (o.profit_margin || 0), 0) / filteredOrders.length
      : 0;
    return { profitable, unprofitable, totalRevenue, totalProfit, avgMargin };
  }, [filteredOrders]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value || 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'pending': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'refunded': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-white/10 text-white/60 border-white/20';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-solid border-emerald-500 border-r-transparent mb-4"></div>
          <div className="text-white text-xl">Loading orders...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-white/60 hover:text-white transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Orders</h1>
            <p className="text-white/60 text-sm">{filteredOrders.length} orders in {dateRange.label.toLowerCase()}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <select
            value={dateRangeOption}
            onChange={(e) => setDateRangeOption(e.target.value as DateRangeOption)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="14d">Last 14 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
          <button
            onClick={syncOrders}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white rounded-lg font-medium transition"
          >
            <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {syncing ? 'Syncing...' : 'Sync Orders'}
          </button>
        </div>
      </div>

      {/* Sync Messages */}
      {syncError && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
          <strong>Sync Error:</strong> {syncError}
        </div>
      )}
      {syncSuccess && (
        <div className="mb-4 p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400">
          {syncSuccess}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
          <div className="text-white/60 text-sm">Total Orders</div>
          <div className="text-2xl font-bold text-white">{filteredOrders.length}</div>
        </div>
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
          <div className="text-white/60 text-sm">Revenue</div>
          <div className="text-2xl font-bold text-white">{formatCurrency(stats.totalRevenue)}</div>
        </div>
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
          <div className="text-white/60 text-sm">Net Profit</div>
          <div className={`text-2xl font-bold ${stats.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(stats.totalProfit)}
          </div>
        </div>
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
          <div className="text-white/60 text-sm">Profitable</div>
          <div className="text-2xl font-bold text-emerald-400">{stats.profitable}</div>
        </div>
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
          <div className="text-white/60 text-sm">Unprofitable</div>
          <div className="text-2xl font-bold text-red-400">{stats.unprofitable}</div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by order #..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'profitable', 'unprofitable'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filterStatus === status
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
              }`}
            >
              {status === 'all' ? 'All' : status === 'profitable' ? 'Profitable' : 'Unprofitable'}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl overflow-hidden mb-6">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-6 py-4 text-white/60 text-sm font-medium">Order</th>
              <th className="text-right px-4 py-4 text-white/60 text-sm font-medium">Revenue</th>
              <th className="text-right px-4 py-4 text-white/60 text-sm font-medium">COGS</th>
              <th className="text-right px-4 py-4 text-white/60 text-sm font-medium">Fees</th>
              <th className="text-right px-4 py-4 text-white/60 text-sm font-medium">Profit</th>
              <th className="text-right px-4 py-4 text-white/60 text-sm font-medium">Margin</th>
              <th className="text-center px-6 py-4 text-white/60 text-sm font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {paginatedOrders.map((order) => (
              <tr
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className="border-b border-white/5 hover:bg-white/5 transition cursor-pointer"
              >
                <td className="px-6 py-4">
                  <div className="text-white font-medium">#{order.order_number}</div>
                  <div className="text-white/40 text-sm">{formatDate(order.order_created_at)}</div>
                </td>
                <td className="px-4 py-4 text-right text-white">
                  {formatCurrency(order.total_price)}
                </td>
                <td className="px-4 py-4 text-right text-red-400/80">
                  -{formatCurrency(order.total_cogs)}
                </td>
                <td className="px-4 py-4 text-right text-amber-400/80">
                  -{formatCurrency((order.payment_processing_fee || 0) + (order.shopify_fee || 0))}
                </td>
                <td className="px-4 py-4 text-right">
                  <span className={`font-bold ${order.net_profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCurrency(order.net_profit)}
                  </span>
                </td>
                <td className="px-4 py-4 text-right">
                  <span className={`font-medium ${
                    (order.profit_margin || 0) >= 30 ? 'text-emerald-400' :
                    (order.profit_margin || 0) >= 15 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {(order.profit_margin || 0).toFixed(1)}%
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.financial_status)}`}>
                    {order.financial_status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:text-white/30 text-white rounded-lg transition"
          >
            Previous
          </button>
          <span className="text-white/60 px-4">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:text-white/30 text-white rounded-lg transition"
          >
            Next
          </button>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-white/20 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">Order #{selectedOrder.order_number}</h3>
                <p className="text-white/60 text-sm">{formatDate(selectedOrder.order_created_at)}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-white/60 hover:text-white transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Profit Breakdown */}
            <div className="bg-white/5 rounded-lg p-4 mb-6">
              <h4 className="text-white font-medium mb-4">Profit Breakdown</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/60">Revenue</span>
                  <span className="text-white font-medium">{formatCurrency(selectedOrder.total_price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">- COGS</span>
                  <span className="text-red-400">{formatCurrency(selectedOrder.total_cogs)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">- Payment Fee</span>
                  <span className="text-amber-400">{formatCurrency(selectedOrder.payment_processing_fee || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">- Shopify Fee</span>
                  <span className="text-amber-400">{formatCurrency(selectedOrder.shopify_fee || 0)}</span>
                </div>
                <div className="border-t border-white/10 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-white font-medium">Net Profit</span>
                    <span className={`font-bold ${selectedOrder.net_profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatCurrency(selectedOrder.net_profit)} ({selectedOrder.profit_margin?.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items */}
            {selectedOrder.line_items && selectedOrder.line_items.length > 0 && (
              <div>
                <h4 className="text-white font-medium mb-4">Line Items</h4>
                <div className="space-y-3">
                  {selectedOrder.line_items.map((item) => (
                    <div key={item.id} className="bg-white/5 rounded-lg p-3 flex justify-between items-center">
                      <div>
                        <div className="text-white">{item.title}</div>
                        <div className="text-white/40 text-sm">
                          {item.quantity} × {formatCurrency(item.price)} | Cost: {formatCurrency(item.cost_per_item)}
                        </div>
                      </div>
                      <div className={`font-medium ${item.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(item.profit)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setSelectedOrder(null)}
              className="w-full mt-6 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
