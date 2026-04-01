'use client';

import Link from 'next/link';

export default function TermsOfService() {
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
            <Link href="/privacy" className="text-white/70 hover:text-white transition text-sm">Privacy</Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="pt-24 pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-4">Terms of Service</h1>
          <p className="text-white/60 mb-8">Last updated: March 2026</p>

          <div className="space-y-8">
            <section className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
              <p className="text-white/70 leading-relaxed">
                By installing and using ProfitPulse (&quot;the App&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the App.
              </p>
            </section>

            <section className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-3">2. Description of Service</h2>
              <p className="text-white/70 leading-relaxed">
                ProfitPulse is a profit analytics application for Shopify stores. The App provides profit tracking, analytics dashboards, cost of goods sold (COGS) management, and AI-powered insights to help merchants understand their true profitability.
              </p>
            </section>

            <section className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-3">3. Account and Access</h2>
              <p className="text-white/70 mb-3">To use ProfitPulse, you must:</p>
              <ul className="list-disc pl-6 text-white/70 space-y-2">
                <li>Have an active Shopify store</li>
                <li>Install the App through the Shopify App Store</li>
                <li>Grant the necessary permissions for the App to access your store data</li>
                <li>Maintain accurate and complete information in your account</li>
              </ul>
            </section>

            <section className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-3">4. Subscription and Billing</h2>
              <p className="text-white/70 mb-3">ProfitPulse offers a free trial period followed by a paid subscription. By subscribing:</p>
              <ul className="list-disc pl-6 text-white/70 space-y-2">
                <li>You authorize Shopify to charge your payment method on file</li>
                <li>Subscriptions renew automatically unless cancelled</li>
                <li>You may cancel at any time through Settings or your Shopify admin</li>
                <li>Pricing is $29.99/month with a 7-day free trial</li>
              </ul>
            </section>

            <section className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-3">5. Accuracy of Data</h2>
              <p className="text-white/70 leading-relaxed">
                While we strive to provide accurate profit calculations, ProfitPulse relies on data you provide (such as COGS) and data from your Shopify store. We are not responsible for inaccuracies resulting from incorrect data entry or Shopify API limitations. Always verify important financial decisions with your own records.
              </p>
            </section>

            <section className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-3">6. Acceptable Use</h2>
              <p className="text-white/70 mb-3">You agree not to:</p>
              <ul className="list-disc pl-6 text-white/70 space-y-2">
                <li>Use the App for any illegal purpose</li>
                <li>Attempt to reverse engineer or hack the App</li>
                <li>Resell or redistribute the App without authorization</li>
                <li>Use the App in ways that could damage or overburden our servers</li>
                <li>Share your account access with unauthorized parties</li>
              </ul>
            </section>

            <section className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-3">7. Intellectual Property</h2>
              <p className="text-white/70 leading-relaxed">
                ProfitPulse, including its design, features, and content, is owned by us and protected by intellectual property laws. You may not copy, modify, or distribute any part of the App without our written permission.
              </p>
            </section>

            <section className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-3">8. Limitation of Liability</h2>
              <p className="text-white/70 leading-relaxed">
                To the maximum extent permitted by law, ProfitPulse and its developers shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or business opportunities, arising from your use of the App.
              </p>
            </section>

            <section className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-3">9. Disclaimer of Warranties</h2>
              <p className="text-white/70 leading-relaxed">
                The App is provided &quot;as is&quot; without warranties of any kind, either express or implied. We do not warrant that the App will be uninterrupted, error-free, or free of harmful components.
              </p>
            </section>

            <section className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-3">10. Termination</h2>
              <p className="text-white/70 leading-relaxed">
                We reserve the right to suspend or terminate your access to the App at any time for violation of these terms or for any other reason. You may terminate your use by uninstalling the App from your Shopify store.
              </p>
            </section>

            <section className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-3">11. Changes to Terms</h2>
              <p className="text-white/70 leading-relaxed">
                We may update these Terms of Service from time to time. Continued use of the App after changes constitutes acceptance of the new terms. We will notify users of significant changes through the App or via email.
              </p>
            </section>

            <section className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-3">12. Contact</h2>
              <p className="text-white/70 leading-relaxed">
                For questions about these Terms of Service, please contact us at:{' '}
                <a href="mailto:adam@argora.ai" className="text-emerald-400 hover:text-emerald-300 transition">
                  adam@argora.ai
                </a>
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
            <Link href="/privacy" className="hover:text-white/60 transition">Privacy Policy</Link>
            <Link href="/faq" className="hover:text-white/60 transition">FAQ</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
