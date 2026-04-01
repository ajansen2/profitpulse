'use client';

import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-zinc-950/80 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <span className="text-white font-bold text-xl">ProfitPulse</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/faq" className="text-white/70 hover:text-white transition text-sm">FAQ</Link>
            <Link href="/terms" className="text-white/70 hover:text-white transition text-sm">Terms</Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="pt-24 pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-4">Privacy Policy</h1>
          <p className="text-white/60 mb-8">Last updated: March 2026</p>

          <div className="space-y-8">
            <section className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-3">1. Introduction</h2>
              <p className="text-white/70 leading-relaxed">
                ProfitPulse (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our Shopify application.
              </p>
            </section>

            <section className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-3">2. Information We Collect</h2>
              <p className="text-white/70 mb-3">When you install and use ProfitPulse, we collect:</p>
              <ul className="list-disc pl-6 text-white/70 space-y-2">
                <li><span className="text-white">Store Information:</span> Shop name, domain, email, timezone, and currency</li>
                <li><span className="text-white">Order Data:</span> Order details including products, prices, and quantities (used to calculate profit metrics)</li>
                <li><span className="text-white">Product Data:</span> Product titles, SKUs, and pricing information</li>
                <li><span className="text-white">Cost Data:</span> Cost of goods sold (COGS) that you manually enter</li>
              </ul>
            </section>

            <section className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-3">3. How We Use Your Information</h2>
              <p className="text-white/70 mb-3">We use the collected information to:</p>
              <ul className="list-disc pl-6 text-white/70 space-y-2">
                <li>Calculate and display profit analytics for your store</li>
                <li>Generate AI-powered insights and recommendations</li>
                <li>Send daily profit digest emails (if enabled)</li>
                <li>Improve our services and user experience</li>
              </ul>
            </section>

            <section className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-3">4. Data Storage and Security</h2>
              <p className="text-white/70 leading-relaxed">
                Your data is securely stored using industry-standard encryption. We use Supabase for database storage with row-level security policies. Access tokens are encrypted and stored securely. We use SSL/TLS encryption for all data in transit.
              </p>
            </section>

            <section className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-3">5. Data Sharing</h2>
              <p className="text-white/70 leading-relaxed">
                We do not sell, trade, or rent your personal information to third parties. We may share data with service providers (such as our AI provider for generating insights) solely to provide our services.
              </p>
            </section>

            <section className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-3">6. Data Retention</h2>
              <p className="text-white/70 leading-relaxed">
                We retain your data for as long as your app is installed. Upon uninstallation, we delete your store data within 48 hours in compliance with Shopify requirements.
              </p>
            </section>

            <section className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-3">7. Your Rights</h2>
              <p className="text-white/70 mb-3">You have the right to:</p>
              <ul className="list-disc pl-6 text-white/70 space-y-2">
                <li>Access your data stored in our system</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Export your data in a portable format (CSV)</li>
                <li>Uninstall the app at any time</li>
              </ul>
            </section>

            <section className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-3">8. GDPR Compliance</h2>
              <p className="text-white/70 leading-relaxed">
                We comply with GDPR requirements. We respond to customer data requests and shop data redaction requests as required by Shopify&apos;s mandatory compliance webhooks.
              </p>
            </section>

            <section className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-3">9. Contact Us</h2>
              <p className="text-white/70 leading-relaxed">
                If you have questions about this Privacy Policy or your data, please contact us at:{' '}
                <a href="mailto:adam@argora.ai" className="text-emerald-400 hover:text-emerald-300 transition">
                  adam@argora.ai
                </a>
              </p>
            </section>

            <section className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-3">10. Changes to This Policy</h2>
              <p className="text-white/70 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
              </p>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-white/40 text-sm">&copy; {new Date().getFullYear()} ProfitPulse by Argora</span>
          <div className="flex items-center gap-6 text-sm text-white/40">
            <Link href="/terms" className="hover:text-white/60 transition">Terms of Service</Link>
            <Link href="/faq" className="hover:text-white/60 transition">FAQ</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
