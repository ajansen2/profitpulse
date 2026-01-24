import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ProfitPulse - Real-Time Profit Analytics',
  description: 'Know your true profit on every order',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Shopify App Bridge CDN - Required for embedded apps */}
        <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js" defer></script>
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
