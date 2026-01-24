import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Shopify OAuth Install Endpoint
 * Redirects merchants to Shopify OAuth authorization page
 */
export async function GET(request: NextRequest) {
  try {
    const shop = request.nextUrl.searchParams.get('shop');

    if (!shop) {
      return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
    }

    // Validate shop format
    const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/;
    if (!shopRegex.test(shop)) {
      return NextResponse.json({ error: 'Invalid shop format' }, { status: 400 });
    }

    // Generate state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // Scopes needed for profit analytics
    const scopes = [
      'read_orders',      // Required for order/profit data
      'read_products',    // Required for COGS per product
    ].join(',');

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get('host')}`;
    const redirectUri = `${appUrl}/api/auth/shopify/callback`;
    const clientId = process.env.SHOPIFY_CLIENT_ID;

    console.log('🚀 Starting OAuth for shop:', shop);

    if (!clientId) {
      return NextResponse.json({ error: 'App not configured - missing client ID' }, { status: 500 });
    }

    // Build Shopify OAuth URL
    const authUrl = new URL(`https://${shop}/admin/oauth/authorize`);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);

    const authUrlString = authUrl.toString();

    // Return HTML that redirects (handles iframe breakout)
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta http-equiv="refresh" content="0;url=${authUrlString}">
          <title>Redirecting to Shopify...</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            }
            .container {
              text-align: center;
              padding: 3rem 2rem;
              background: white;
              border-radius: 12px;
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            }
            .spinner {
              border: 4px solid #f3f3f3;
              border-top: 4px solid #10b981;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              animation: spin 1s linear infinite;
              margin: 0 auto 1rem;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="spinner"></div>
            <h1>Connecting to Shopify...</h1>
            <p>Please wait while we redirect you.</p>
          </div>
          <script>
            (function() {
              if (window.top) {
                window.top.location.href = "${authUrlString}";
              } else {
                window.location.href = "${authUrlString}";
              }
            })();
          </script>
        </body>
      </html>
    `;

    const response = new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    });

    response.cookies.set('shopify_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600
    });

    response.cookies.set('shopify_oauth_shop', shop, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600
    });

    return response;
  } catch (error) {
    console.error('❌ OAuth install error:', error);
    return NextResponse.json({ error: 'Installation failed' }, { status: 500 });
  }
}
