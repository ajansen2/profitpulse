'use client';

import { useState, useMemo } from 'react';
import { createAuthenticatedFetch } from '@/lib/authenticated-fetch';

interface Store {
  id: string;
  store_name: string;
  shop_domain: string;
}

interface Insight {
  id: string;
  type: 'warning' | 'opportunity' | 'tip' | 'trend';
  title: string;
  content: string;
  impact?: string;
  action?: string;
}

interface AIProfitCoachProps {
  store: Store;
  summary: {
    totalRevenue: number;
    totalProfit: number;
    avgProfitMargin: number;
    totalOrders: number;
  };
  topProducts: Array<{ title: string; profit: number; margin: number; quantity: number }>;
}

export default function AIProfitCoach({ store, summary, topProducts }: AIProfitCoachProps) {
  const authFetch = useMemo(() => createAuthenticatedFetch(store.shop_domain), [store.shop_domain]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const generateInsights = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: store.id,
          summary,
          topProducts
        })
      });
      const data = await res.json();
      if (data.insights) {
        setInsights(data.insights);
      }
    } catch (err) {
      console.error('Error generating insights:', err);
      // Fallback demo insights
      setInsights(generateFallbackInsights(summary, topProducts));
    } finally {
      setLoading(false);
      setExpanded(true);
    }
  };

  const generateFallbackInsights = (
    summary: AIProfitCoachProps['summary'],
    products: AIProfitCoachProps['topProducts']
  ): Insight[] => {
    const insights: Insight[] = [];

    // Margin analysis
    if (summary.avgProfitMargin < 20) {
      insights.push({
        id: '1',
        type: 'warning',
        title: 'Low Profit Margins',
        content: `Your average margin is ${summary.avgProfitMargin.toFixed(1)}%, which is below the healthy 20-30% range for e-commerce.`,
        impact: 'Could be leaving thousands on the table',
        action: 'Review COGS and consider price increases on top sellers'
      });
    } else if (summary.avgProfitMargin > 40) {
      insights.push({
        id: '1',
        type: 'opportunity',
        title: 'Strong Margins - Room to Scale',
        content: `Your ${summary.avgProfitMargin.toFixed(1)}% margin is excellent. You have room to invest in growth.`,
        impact: 'Could increase volume without sacrificing profit',
        action: 'Consider investing more in ads on high-margin products'
      });
    }

    // Product-specific insights
    const lowMarginProducts = products.filter(p => p.margin < 15);
    if (lowMarginProducts.length > 0) {
      insights.push({
        id: '2',
        type: 'warning',
        title: 'Products Eating Your Profit',
        content: `${lowMarginProducts.length} product(s) have margins below 15%. "${lowMarginProducts[0]?.title}" is your lowest at ${lowMarginProducts[0]?.margin.toFixed(1)}%.`,
        impact: `Selling ${lowMarginProducts[0]?.quantity || 0} units at thin margins`,
        action: 'Raise prices or find cheaper suppliers for these items'
      });
    }

    const highProfitProducts = products.filter(p => p.profit > 0).slice(0, 3);
    if (highProfitProducts.length > 0) {
      insights.push({
        id: '3',
        type: 'opportunity',
        title: 'Double Down on Winners',
        content: `"${highProfitProducts[0]?.title}" generated $${highProfitProducts[0]?.profit.toFixed(0)} in profit. Your top 3 products drive most of your margins.`,
        impact: 'Could significantly increase profit with focused effort',
        action: 'Increase ad spend on these top performers'
      });
    }

    // Order volume
    if (summary.totalOrders < 30) {
      insights.push({
        id: '4',
        type: 'tip',
        title: 'Volume Opportunity',
        content: 'Lower order volume means each sale matters more. Focus on conversion optimization.',
        action: 'Test urgency messaging and abandoned cart recovery'
      });
    }

    // Bundle suggestion
    if (products.length >= 2) {
      insights.push({
        id: '5',
        type: 'opportunity',
        title: 'Bundle Opportunity',
        content: `Consider bundling "${products[0]?.title}" with "${products[1]?.title}" at a small discount to increase average order value.`,
        impact: 'Bundles typically increase AOV by 15-25%',
        action: 'Use the Bundle Calculator in Settings to test profitability'
      });
    }

    return insights;
  };

  const getTypeStyles = (type: Insight['type']) => {
    switch (type) {
      case 'warning':
        return {
          bg: 'bg-red-500/10',
          border: 'border-red-500/30',
          icon: 'text-red-400',
          iconBg: 'bg-red-500/20'
        };
      case 'opportunity':
        return {
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/30',
          icon: 'text-emerald-400',
          iconBg: 'bg-emerald-500/20'
        };
      case 'tip':
        return {
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/30',
          icon: 'text-blue-400',
          iconBg: 'bg-blue-500/20'
        };
      case 'trend':
        return {
          bg: 'bg-purple-500/10',
          border: 'border-purple-500/30',
          icon: 'text-purple-400',
          iconBg: 'bg-purple-500/20'
        };
    }
  };

  const getTypeIcon = (type: Insight['type']) => {
    switch (type) {
      case 'warning':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'opportunity':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case 'tip':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
      case 'trend':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-2 border-purple-500/30 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">AI Profit Coach</h3>
            <p className="text-white/60 text-sm">Get personalized insights to improve your margins</p>
          </div>
        </div>
        <button
          onClick={generateInsights}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Analyzing...
            </>
          ) : insights.length > 0 ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate Insights
            </>
          )}
        </button>
      </div>

      {/* Insights */}
      {expanded && insights.length > 0 && (
        <div className="px-6 pb-6 space-y-4">
          {insights.map((insight) => {
            const styles = getTypeStyles(insight.type);
            return (
              <div
                key={insight.id}
                className={`${styles.bg} border ${styles.border} rounded-lg p-4`}
              >
                <div className="flex gap-4">
                  <div className={`w-10 h-10 ${styles.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <span className={styles.icon}>{getTypeIcon(insight.type)}</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-medium mb-1">{insight.title}</h4>
                    <p className="text-white/70 text-sm">{insight.content}</p>
                    {insight.impact && (
                      <p className="text-white/50 text-sm mt-2">
                        <span className="font-medium">Impact:</span> {insight.impact}
                      </p>
                    )}
                    {insight.action && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <p className="text-white/60 text-sm">
                          <span className="font-medium text-white/80">Recommended action:</span> {insight.action}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && insights.length === 0 && (
        <div className="px-6 pb-6">
          <div className="bg-white/5 rounded-lg p-8 text-center">
            <p className="text-white/60">Click "Generate Insights" to get AI-powered recommendations</p>
          </div>
        </div>
      )}
    </div>
  );
}
