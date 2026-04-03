'use client';

import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { HeroSection } from '@/components/ui/hero-section';
import { FeaturesAccordion, FeatureCards } from '@/components/ui/interactive-image-accordion';
import { Check, ArrowRight, Sparkles } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Animated Hero Section */}
      <HeroSection />

      {/* Animated Dashboard Preview */}
      <DashboardPreview />

      {/* Features Accordion */}
      <FeaturesAccordion />

      {/* Additional Feature Cards */}
      <FeatureCards />

      {/* Stats Section */}
      <StatsSection />

      {/* Pricing Section */}
      <PricingSection />

      {/* CTA Section */}
      <CTASection />

      {/* Footer */}
      <Footer />
    </div>
  );
}

// Animated Dashboard Preview with Charts
function DashboardPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], [100, -100]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);

  return (
    <section ref={ref} className="py-20 px-6 relative overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <motion.div
          style={{ y, opacity }}
          className="relative"
        >
          {/* Glow effect */}
          <div className="absolute -inset-4 bg-emerald-500/20 rounded-3xl blur-3xl"></div>

          <div className="relative bg-zinc-900/80 border border-white/10 rounded-3xl p-3 shadow-2xl backdrop-blur-xl">
            <div className="bg-zinc-950 rounded-2xl p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <span className="text-white/40 text-sm">ProfitPulse Dashboard</span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Revenue', value: '$24,892', color: 'text-white', change: '+12.5%', positive: true },
                  { label: 'Total Costs', value: '$8,412', color: 'text-red-400', change: '-3.2%', positive: true },
                  { label: 'Net Profit', value: '$16,480', color: 'text-emerald-400', change: '+18.7%', positive: true },
                  { label: 'Margin', value: '66.2%', color: 'text-emerald-400', change: '+2.1%', positive: true },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-zinc-800/50 rounded-xl p-4 border border-white/5"
                  >
                    <div className="text-white/60 text-sm">{stat.label}</div>
                    <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                    <div className={`text-xs mt-1 ${stat.positive ? 'text-emerald-400' : 'text-red-400'}`}>
                      {stat.change}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Chart Area */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Bar Chart */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className="bg-zinc-800/30 rounded-xl p-4 border border-white/5"
                >
                  <div className="text-white/80 text-sm font-medium mb-4">Daily Profit</div>
                  <div className="flex items-end gap-2 h-32">
                    {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        whileInView={{ height: `${h}%` }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 + i * 0.05, duration: 0.5 }}
                        className="flex-1 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t"
                      />
                    ))}
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-white/40">
                    <span>Mon</span>
                    <span>Thu</span>
                    <span>Sun</span>
                  </div>
                </motion.div>

                {/* Pie Chart */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                  className="bg-zinc-800/30 rounded-xl p-4 border border-white/5"
                >
                  <div className="text-white/80 text-sm font-medium mb-4">Revenue Breakdown</div>
                  <div className="flex items-center justify-center gap-6">
                    <div className="relative w-28 h-28">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#27272a"
                          strokeWidth="12"
                        />
                        <motion.circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#22c55e"
                          strokeWidth="12"
                          strokeDasharray="251.2"
                          initial={{ strokeDashoffset: 251.2 }}
                          whileInView={{ strokeDashoffset: 85 }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: 0.5 }}
                        />
                        <motion.circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="12"
                          strokeDasharray="251.2"
                          strokeDashoffset="-166"
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.5, delay: 1 }}
                        />
                        <motion.circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="12"
                          strokeDasharray="251.2"
                          strokeDashoffset="-216"
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.5, delay: 1.2 }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl font-bold text-emerald-400">66%</span>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-emerald-500"></div>
                        <span className="text-white/60">Profit</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-red-500"></div>
                        <span className="text-white/60">COGS</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-amber-500"></div>
                        <span className="text-white/60">Fees</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// Stats Section
function StatsSection() {
  const stats = [
    { value: '10K+', label: 'Orders Tracked' },
    { value: '$2M+', label: 'Profit Calculated' },
    { value: '99.9%', label: 'Uptime' },
    { value: '< 1s', label: 'Sync Time' },
  ];

  return (
    <section className="py-16 px-6 border-y border-white/5">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">{stat.value}</div>
              <div className="text-white/60 text-sm">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Pricing Section
function PricingSection() {
  const features = [
    'Unlimited orders & products',
    'Real-time profit dashboard',
    'Product-level COGS tracking',
    'Automated fee calculations',
    'Profit goals & tracking',
    'AI profit forecasting',
    'CSV data export',
    '7-day free trial',
  ];

  return (
    <section id="pricing" className="py-20 px-6">
      <div className="max-w-xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Simple, transparent pricing</h2>
          <p className="text-white/60 mb-10">One plan. Everything included. No hidden fees.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
          className="relative group"
        >
          {/* Glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all"></div>

          <div className="relative bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border-2 border-emerald-500/30 rounded-3xl p-8 backdrop-blur-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 rounded-full text-emerald-400 text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              Most Popular
            </div>
            <div className="text-emerald-400 font-medium mb-2">ProfitPulse Pro</div>
            <div className="flex items-baseline justify-center gap-1 mb-6">
              <span className="text-5xl font-bold text-white">$29.99</span>
              <span className="text-white/60">/month</span>
            </div>

            <ul className="text-left space-y-3 mb-8">
              {features.map((item) => (
                <li key={item} className="flex items-center gap-3 text-white/80">
                  <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            <a
              href="https://apps.shopify.com/profitpulse"
              className="block w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-lg transition shadow-lg shadow-emerald-500/25"
            >
              Start Free Trial
            </a>
            <p className="text-white/40 text-sm mt-3">No credit card required</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// CTA Section
function CTASection() {
  return (
    <section className="py-20 px-6 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/50 to-transparent"></div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative max-w-3xl mx-auto text-center"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Stop guessing. Start knowing.
        </h2>
        <p className="text-white/60 mb-8 text-lg">
          Join thousands of Shopify merchants who finally understand their real profit margins.
        </p>
        <motion.a
          href="https://apps.shopify.com/profitpulse"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-lg transition shadow-lg shadow-emerald-500/25"
        >
          Install ProfitPulse Free
          <ArrowRight className="w-5 h-5" />
        </motion.a>
      </motion.div>
    </section>
  );
}

// Footer
function Footer() {
  return (
    <footer className="border-t border-white/10 py-10 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
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
  );
}
