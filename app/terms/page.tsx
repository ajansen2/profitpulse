export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>
        <p className="text-gray-600 mb-4">Last updated: March 2026</p>

        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p>
              By installing and using ProfitPulse ("the App"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the App.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Description of Service</h2>
            <p>
              ProfitPulse is a profit analytics application for Shopify stores. The App provides profit tracking, analytics dashboards, cost of goods sold (COGS) management, and AI-powered insights to help merchants understand their true profitability.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Account and Access</h2>
            <p className="mb-2">
              To use ProfitPulse, you must:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Have an active Shopify store</li>
              <li>Install the App through the Shopify App Store</li>
              <li>Grant the necessary permissions for the App to access your store data</li>
              <li>Maintain accurate and complete information in your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Subscription and Billing</h2>
            <p className="mb-2">
              ProfitPulse offers a free trial period followed by a paid subscription. By subscribing:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>You authorize Shopify to charge your payment method on file</li>
              <li>Subscriptions renew automatically unless cancelled</li>
              <li>You may cancel at any time through your Shopify admin</li>
              <li>Refunds are handled according to Shopify's refund policies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Accuracy of Data</h2>
            <p>
              While we strive to provide accurate profit calculations, ProfitPulse relies on data you provide (such as COGS) and data from your Shopify store. We are not responsible for inaccuracies resulting from incorrect data entry or Shopify API limitations. Always verify important financial decisions with your own records.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Acceptable Use</h2>
            <p className="mb-2">You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Use the App for any illegal purpose</li>
              <li>Attempt to reverse engineer or hack the App</li>
              <li>Resell or redistribute the App without authorization</li>
              <li>Use the App in ways that could damage or overburden our servers</li>
              <li>Share your account access with unauthorized parties</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Intellectual Property</h2>
            <p>
              ProfitPulse, including its design, features, and content, is owned by us and protected by intellectual property laws. You may not copy, modify, or distribute any part of the App without our written permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, ProfitPulse and its developers shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or business opportunities, arising from your use of the App.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Disclaimer of Warranties</h2>
            <p>
              The App is provided "as is" without warranties of any kind, either express or implied. We do not warrant that the App will be uninterrupted, error-free, or free of harmful components.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your access to the App at any time for violation of these terms or for any other reason. You may terminate your use by uninstalling the App from your Shopify store.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Changes to Terms</h2>
            <p>
              We may update these Terms of Service from time to time. Continued use of the App after changes constitutes acceptance of the new terms. We will notify users of significant changes through the App or via email.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Contact</h2>
            <p>
              For questions about these Terms of Service, please contact us at: support@argora.ai
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
