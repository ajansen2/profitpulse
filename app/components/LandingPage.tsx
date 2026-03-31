'use client';

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-emerald-950 to-zinc-950">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-zinc-950/80 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <span className="text-white font-bold text-xl">ProfitPulse</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/faq" className="text-white/70 hover:text-white transition text-sm">FAQ</Link>
            <Link href="/privacy" className="text-white/70 hover:text-white transition text-sm">Privacy</Link>
            <a
              href="https://apps.shopify.com/profitpulse"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium text-sm transition"
            >
              Install Free
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-sm font-medium mb-8">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
            7-day free trial - No credit card required
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Revenue is vanity.<br />
            <span className="text-emerald-400">Profit is sanity.</span>
          </h1>
          <p className="text-xl text-white/60 mb-10 max-w-2xl mx-auto">
            See the real profit on every Shopify order. Track COGS, fees, and margins in real-time.
            Know exactly which products make you money.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://apps.shopify.com/profitpulse"
              className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-lg transition shadow-lg shadow-emerald-500/25 flex items-center gap-2"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.5 2.25a.75.75 0 01.75-.75h3.5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0V3.81l-4.97 4.97a.75.75 0 11-1.06-1.06l4.97-4.97h-1.94a.75.75 0 01-.75-.75z" />
                <path d="M5 6.75A2.25 2.25 0 017.25 4.5h6a.75.75 0 000-1.5h-6A3.75 3.75 0 003.5 6.75v10.5A3.75 3.75 0 007.25 21h10.5A3.75 3.75 0 0021 17.25v-6a.75.75 0 00-1.5 0v6a2.25 2.25 0 01-2.25 2.25H7.25A2.25 2.25 0 015 17.25V6.75z" />
              </svg>
              Install on Shopify
            </a>
            <span className="text-white/40">$29.99/mo after trial</span>
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="py-10 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-2 shadow-2xl">
            <div className="bg-zinc-950 rounded-xl p-6">
              <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Revenue', value: '$24,892', color: 'text-white' },
                  { label: 'Total Costs', value: '$8,412', color: 'text-red-400' },
                  { label: 'Net Profit', value: '$16,480', color: 'text-emerald-400' },
                  { label: 'Margin', value: '66.2%', color: 'text-emerald-400' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-zinc-800/50 rounded-lg p-4">
                    <div className="text-white/60 text-sm">{stat.label}</div>
                    <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                  </div>
                ))}
              </div>
              <div className="h-48 bg-zinc-800/30 rounded-lg flex items-center justify-center">
                <div className="flex items-end gap-2 h-32">
                  {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                    <div key={i} className="w-6 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Everything you need to track profit
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: '📊',
                title: 'Real-Time Dashboard',
                desc: 'See profit, revenue, and costs update instantly as orders come in.',
              },
              {
                icon: '📦',
                title: 'Product-Level COGS',
                desc: 'Track cost of goods sold for every product and variant.',
              },
              {
                icon: '💰',
                title: 'Fee Tracking',
                desc: 'Automatically calculate payment processing and Shopify fees.',
              },
              {
                icon: '📈',
                title: 'Profit Trends',
                desc: 'Charts showing daily, weekly, and monthly profit trends.',
              },
              {
                icon: '🎯',
                title: 'Profit Goals',
                desc: 'Set daily and monthly targets with progress tracking.',
              },
              {
                icon: '📋',
                title: 'Order Breakdown',
                desc: 'See exactly why each order was profitable or not.',
              },
            ].map((feature) => (
              <div key={feature.title} className="bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="text-3xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-white/60 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6 bg-zinc-900/50">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Simple pricing</h2>
          <p className="text-white/60 mb-10">One plan. Everything included. No hidden fees.</p>
          <div className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border-2 border-emerald-500/30 rounded-2xl p-8">
            <div className="text-emerald-400 font-medium mb-2">ProfitPulse Pro</div>
            <div className="flex items-baseline justify-center gap-1 mb-4">
              <span className="text-5xl font-bold text-white">$29.99</span>
              <span className="text-white/60">/month</span>
            </div>
            <ul className="text-left space-y-3 mb-8">
              {[
                'Unlimited orders & products',
                'Real-time profit dashboard',
                'Product-level COGS tracking',
                'Automated fee calculations',
                'Profit goals & tracking',
                'CSV data export',
                '7-day free trial',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-white/80">
                  <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <a
              href="https://apps.shopify.com/profitpulse"
              className="block w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-lg transition"
            >
              Start Free Trial
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Stop guessing. Start knowing.
          </h2>
          <p className="text-white/60 mb-8">
            Join thousands of Shopify merchants who finally understand their real profit margins.
          </p>
          <a
            href="https://apps.shopify.com/profitpulse"
            className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-lg transition"
          >
            Install ProfitPulse Free
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="text-white/60 text-sm">ProfitPulse</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-white/40">
            <Link href="/privacy" className="hover:text-white/60 transition">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white/60 transition">Terms of Service</Link>
            <Link href="/faq" className="hover:text-white/60 transition">FAQ</Link>
          </div>
          <div className="text-white/40 text-sm">
            &copy; {new Date().getFullYear()} ProfitPulse
          </div>
        </div>
      </footer>
    </div>
  );
}
