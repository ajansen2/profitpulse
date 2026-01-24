# ProfitPulse - Real-Time Profit Analytics for Shopify

Know your true profit on every order. ProfitPulse tracks COGS, payment fees, Shopify fees, and ad spend to show you exactly how much you're making.

## Features

- Real-time profit tracking per order
- COGS management (per product or default %)
- Payment processing fee calculation
- Shopify transaction fee tracking
- Ad spend integration (Facebook, Google)
- Daily/weekly/monthly profit charts
- Top products by profitability
- Attribution tracking (UTM, ad platforms)

## Pricing

$99/month with 7-day free trial

---

## Quick Start

### 1. Clone and Install

```bash
cd profitpulse
npm install
```

### 2. Set Up Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Go to SQL Editor
3. Run the contents of `supabase_schema.sql`
4. Copy your project URL and service role key

### 3. Create Shopify App

1. Go to [partners.shopify.com](https://partners.shopify.com)
2. Create new app
3. Set App URL: `https://profitpulse.vercel.app`
4. Set Redirect URL: `https://profitpulse.vercel.app/api/auth/shopify/callback`
5. Enable scopes: `read_orders`, `read_products`, `read_customers`
6. Copy API Key and Secret

### 4. Configure Environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in:
- `SHOPIFY_API_KEY` - from Shopify Partners
- `SHOPIFY_API_SECRET` - from Shopify Partners
- `NEXT_PUBLIC_SUPABASE_URL` - from Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - from Supabase
- `NEXT_PUBLIC_APP_URL` - your Vercel URL

### 5. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Or connect GitHub repo to Vercel for auto-deploys.

### 6. Configure Webhooks in Shopify

In your Shopify Partner app settings, add webhooks:
- `orders/create` -> `https://profitpulse.vercel.app/api/webhooks/shopify/orders`
- `orders/updated` -> `https://profitpulse.vercel.app/api/webhooks/shopify/orders`
- `app/uninstalled` -> `https://profitpulse.vercel.app/api/webhooks/shopify/uninstall`

GDPR webhooks:
- Customer data request: `/api/webhooks/customers/data-request`
- Customer deletion: `/api/webhooks/customers/redact`
- Shop deletion: `/api/webhooks/shop/redact`

---

## Shopify App Store Submission Checklist

### Required for Approval

- [ ] App loads without errors in embedded iframe
- [ ] OAuth flow works (install -> billing -> dashboard)
- [ ] Billing charges work (test with development store first)
- [ ] GDPR webhooks configured and responding
- [ ] App description and screenshots ready
- [ ] Privacy policy URL
- [ ] Support email

### Testing Before Submission

1. **Development Store Test**
   ```bash
   npm run dev
   shopify app dev --config shopify.app.profitpulse.toml
   ```

2. **Production Test**
   - Deploy to Vercel
   - Install on dev store
   - Complete billing flow
   - Verify webhooks receive orders
   - Check profit calculations

### Common Review Issues

1. **Billing not working** - Ensure `test: true` is only set for dev stores
2. **Iframe errors** - Use App Bridge CDN, not npm package
3. **GDPR webhooks failing** - Must return 200 even on errors
4. **Missing scopes** - Request only what you need

---

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/shopify/install` | GET | Start OAuth flow |
| `/api/auth/shopify/callback` | GET | Complete OAuth, create billing |
| `/api/billing/create` | GET/POST | Create billing charge |
| `/api/stores/lookup` | GET | Get store by shop domain |
| `/api/analytics/summary` | GET | Dashboard metrics |
| `/api/products` | GET/POST | Product COGS management |
| `/api/products/sync` | POST | Sync products from Shopify |
| `/api/settings` | GET/POST | Store settings |
| `/api/webhooks/shopify/orders` | POST | Order webhooks |
| `/api/webhooks/shopify/uninstall` | POST | App uninstall |
| `/api/webhooks/customers/*` | POST | GDPR webhooks |
| `/api/webhooks/shop/redact` | POST | Shop data deletion |

---

## Database Schema

See `supabase_schema.sql` for full schema. Key tables:

- `stores` - Shopify stores with access tokens
- `store_settings` - Default COGS, fee rates
- `products` - Product-level COGS
- `orders` - Orders with profit calculations
- `order_line_items` - Item-level profit
- `ad_spend` - Daily ad spend by platform
- `ad_connections` - Connected ad accounts

---

## Profit Calculation

```
Revenue = subtotal_price + (shipping if included) + (tax if included)
COGS = sum of (quantity * cost_per_item) for all line items
Payment Fee = (total_price * processing_rate) + fixed_fee
Shopify Fee = total_price * shopify_plan_rate
Net Profit = Revenue - COGS - Payment Fee - Shopify Fee - Ad Spend
Margin = (Net Profit / Revenue) * 100
```

---

## Development

```bash
# Run locally
npm run dev

# With Shopify CLI (for embedded preview)
shopify app dev --config shopify.app.profitpulse.toml

# Build
npm run build

# Lint
npm run lint
```

---

## Support

For issues, contact: your-email@example.com
