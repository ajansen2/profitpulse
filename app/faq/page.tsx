'use client';

import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQItem[] = [
  // Getting Started
  {
    category: 'Getting Started',
    question: 'How do I set up ProfitPulse?',
    answer: 'After installing, go to Settings > General and click "Sync Products" then "Sync Orders". This pulls your Shopify data. Then set your default COGS percentage under Settings > General, or add specific costs per product in the Products tab.',
  },
  {
    category: 'Getting Started',
    question: 'What does the 7-day free trial include?',
    answer: 'The free trial gives you full access to all ProfitPulse features for 7 days. No credit card required to start. After the trial, you can upgrade to Pro for $29.99/month.',
  },
  {
    category: 'Getting Started',
    question: 'How often should I sync my data?',
    answer: 'Orders sync automatically via webhook when new orders come in. You can manually sync anytime from Settings > General. We recommend syncing products whenever you add new items to your store.',
  },

  // Profit Calculation
  {
    category: 'Profit Calculation',
    question: 'How is profit calculated?',
    answer: 'Net Profit = Revenue - COGS - Payment Fees - Shopify Fees - Shipping Costs. We track each component separately so you can see exactly where your money goes.',
  },
  {
    category: 'Profit Calculation',
    question: 'What fees are included automatically?',
    answer: 'We calculate payment processing fees (default 2.9% + $0.30 for Shopify Payments) and Shopify transaction fees based on your plan. You can customize these rates in Settings > Fees.',
  },
  {
    category: 'Profit Calculation',
    question: 'What is COGS and how do I set it?',
    answer: 'COGS (Cost of Goods Sold) is what you pay to make or buy each product. Set a default percentage in Settings, or go to the Products tab to set specific costs per product. More accurate COGS = more accurate profit.',
  },
  {
    category: 'Profit Calculation',
    question: 'Why does my profit look wrong?',
    answer: 'Usually this means COGS is not set correctly. Check that you\'ve either set a default COGS percentage in Settings, or added costs to individual products. Also verify your payment processing and Shopify plan settings.',
  },

  // Billing & Subscription
  {
    category: 'Billing',
    question: 'How much does ProfitPulse cost?',
    answer: '$29.99/month flat. No per-order fees. No hidden charges. No price increases for existing customers. You can cancel anytime.',
  },
  {
    category: 'Billing',
    question: 'How do I cancel my subscription?',
    answer: 'Go to Settings > General > Subscription and click "Cancel Subscription". Your access continues until the end of your billing period. No hassle, no phone calls required.',
  },
  {
    category: 'Billing',
    question: 'Can I get a refund?',
    answer: 'We offer a 7-day free trial so you can try before you pay. If you have billing issues, email us at adam@argora.ai and we\'ll make it right.',
  },
  {
    category: 'Billing',
    question: 'Will my price ever increase?',
    answer: 'No. We lock in your price when you subscribe. If we raise prices for new customers, existing customers keep their original rate.',
  },

  // Features
  {
    category: 'Features',
    question: 'What is the Hidden Fee Finder?',
    answer: 'It scans your orders to find fees you might be missing - like higher-than-expected payment processing rates, potential Shopify plan upgrade savings, chargebacks, and shipping inefficiencies.',
  },
  {
    category: 'Features',
    question: 'How does AI Profit Coach work?',
    answer: 'Our AI analyzes your store\'s data and generates actionable insights - like identifying unprofitable products, suggesting pricing changes, or spotting trends you might miss.',
  },
  {
    category: 'Features',
    question: 'Can I track ad spend?',
    answer: 'Yes! Go to Settings > Ad Spend to manually log your Facebook, Google, TikTok, and other ad costs. This gets factored into your profit calculations and ROAS tracking.',
  },
  {
    category: 'Features',
    question: 'Can I export my data?',
    answer: 'Yes. On the Dashboard, click the export button to download your orders and products as CSV files. You own your data.',
  },

  // Support
  {
    category: 'Support',
    question: 'How do I get help?',
    answer: 'Email us at adam@argora.ai. We\'re a small team and respond to every message personally, usually within 24 hours.',
  },
  {
    category: 'Support',
    question: 'Is there a knowledge base or tutorials?',
    answer: 'This FAQ covers the most common questions. For anything else, just email us - we\'re happy to help you get set up.',
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = ['all', ...Array.from(new Set(faqs.map(f => f.category)))];
  const filteredFaqs = activeCategory === 'all' ? faqs : faqs.filter(f => f.category === activeCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Frequently Asked Questions</h1>
          <p className="text-white/60 text-lg">
            Everything you need to know about ProfitPulse
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeCategory === cat
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
              }`}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {filteredFaqs.map((faq, index) => (
            <div
              key={index}
              className="bg-white/5 backdrop-blur border border-white/10 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-white/5 transition"
              >
                <span className="text-white font-medium pr-4">{faq.question}</span>
                <svg
                  className={`w-5 h-5 text-white/60 transition-transform ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openIndex === index && (
                <div className="px-6 pb-4">
                  <p className="text-white/70 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact Section */}
        <div className="mt-12 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-8 text-center">
          <h2 className="text-xl font-bold text-white mb-2">Still have questions?</h2>
          <p className="text-white/60 mb-4">
            We're here to help. Reach out and we'll get back to you within 24 hours.
          </p>
          <a
            href="mailto:adam@argora.ai"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Email adam@argora.ai
          </a>
        </div>

        {/* Back to Dashboard */}
        <div className="mt-8 text-center">
          <a
            href="/"
            className="text-white/60 hover:text-white text-sm underline transition"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
