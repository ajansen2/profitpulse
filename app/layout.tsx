import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ProfitPulse - Real-Time Profit Analytics',
  description: 'Know your true profit on every order',
  manifest: '/manifest.json',
  themeColor: '#10b981',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ProfitPulse',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY!;

  return (
    <html lang="en">
      <head>
        {/* PWA Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ProfitPulse" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />

        {/* Shopify App Bridge - MUST be first script, synchronous, from CDN */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
        {/* Shopify API key meta tag for App Bridge */}
        <meta name="shopify-api-key" content={apiKey} />
        {/* Initialize App Bridge with retry logic - waits for CDN to load */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{__html: `
          (function() {
            // Only initialize if embedded in Shopify (in iframe)
            if (window.self === window.top) {
              return; // Not embedded, skip
            }

            var retryCount = 0;
            var maxRetries = 50; // Try for ~5 seconds

            // Wait for window.shopify to be available with retry logic
            function initializeAppBridge() {
              if (window.shopify && window.shopify.createApp) {
                try {
                  var urlParams = new URLSearchParams(window.location.search);
                  var host = urlParams.get('host');
                  var shop = urlParams.get('shop');

                  if (host && shop) {
                    window.shopifyApp = window.shopify.createApp({
                      apiKey: '${apiKey}',
                      host: host,
                      forceRedirect: false
                    });
                    console.log('✅ App Bridge initialized from CDN (inline script after ' + retryCount + ' retries)');
                  }
                } catch (error) {
                  console.error('❌ Failed to initialize App Bridge:', error);
                }
              } else {
                retryCount++;
                if (retryCount < maxRetries) {
                  // Retry after a short delay
                  setTimeout(initializeAppBridge, 100);
                } else {
                  console.error('❌ Timed out waiting for Shopify App Bridge CDN to load');
                }
              }
            }

            // Start initialization attempt
            initializeAppBridge();
          })();
        `}} />
        {/* Service Worker Registration for PWA */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{__html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js')
                .then(function(registration) {
                  console.log('✅ ServiceWorker registered:', registration.scope);
                })
                .catch(function(error) {
                  console.log('❌ ServiceWorker registration failed:', error);
                });
            });
          }
        `}} />
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
