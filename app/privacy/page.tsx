export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        <p className="text-gray-600 mb-4">Last updated: March 2026</p>

        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
            <p>
              ProfitPulse ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our Shopify application.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
            <p className="mb-2">When you install and use ProfitPulse, we collect:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Store Information:</strong> Shop name, domain, email, timezone, and currency</li>
              <li><strong>Order Data:</strong> Order details including products, prices, and quantities (used to calculate profit metrics)</li>
              <li><strong>Product Data:</strong> Product titles, SKUs, and pricing information</li>
              <li><strong>Cost Data:</strong> Cost of goods sold (COGS) that you manually enter</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
            <p className="mb-2">We use the collected information to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Calculate and display profit analytics for your store</li>
              <li>Generate AI-powered insights and recommendations</li>
              <li>Send daily profit digest emails (if enabled)</li>
              <li>Improve our services and user experience</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Data Storage and Security</h2>
            <p>
              Your data is securely stored using industry-standard encryption. We use Supabase for database storage with row-level security policies. Access tokens are encrypted and stored securely.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Data Sharing</h2>
            <p>
              We do not sell, trade, or rent your personal information to third parties. We may share data with service providers (such as our AI provider for generating insights) solely to provide our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Data Retention</h2>
            <p>
              We retain your data for as long as your app is installed. Upon uninstallation, we delete your store data within 48 hours in compliance with Shopify requirements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Your Rights</h2>
            <p className="mb-2">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Access your data stored in our system</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Uninstall the app at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. GDPR Compliance</h2>
            <p>
              We comply with GDPR requirements. We respond to customer data requests and shop data redaction requests as required by Shopify's mandatory compliance webhooks.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or your data, please contact us at: support@argora.ai
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-gray-500 text-sm">
            ProfitPulse is developed by Argora. For more information, visit argora.ai
          </p>
        </div>
      </div>
    </div>
  );
}
