# ProfitPulse - Know Your True Profit on Every Order

**Revenue is vanity. Profit is sanity.** Shopify shows you what you sell, but not what you actually keep. ProfitPulse reveals your true profit after COGS, payment fees, Shopify fees, and shipping - so you know exactly which products and orders are making you money.

## Why ProfitPulse?

Shopify's analytics show revenue, but merchants are left guessing their actual margins. Most "profit" apps charge $50-150/month and overwhelm you with features you don't need.

**ProfitPulse is different:**
- **$29.99/month flat** - No per-order fees, unlimited orders
- **See profit in 10 seconds** - Clean dashboard, no clutter
- **True cost visibility** - COGS, payment fees, Shopify fees, shipping - all in one place
- **Product-level profit** - Know which products actually make money vs. which just look busy
- **7-day free trial** - Try before you commit

## What You Get

### Real-Time Profit Dashboard
- Net profit per order (not just revenue)
- Daily/weekly/monthly profit trends
- Profit margin % on every sale
- Revenue vs. actual profit comparison

### Product Profitability
- Profit per product (not just sales volume)
- Which products have the best margins
- Which products are losing money
- Bulk COGS management

### Cost Tracking
- Payment processing fees (2.9% + $0.30, etc.)
- Shopify transaction fees by plan
- Shipping costs
- Custom expense tracking

### AI Insights (Coming Soon)
- Weekly profit summaries
- Margin drop alerts
- Product recommendations

## Pricing

**$29.99/month** with 7-day free trial. Cancel anytime.

Compare to:
- BeProfit: $49-249/month
- TrueProfit: $25-99/month
- Lifetimely: $149/month

---

## Quick Start

### 1. Install from Shopify App Store
Search "ProfitPulse" or install directly from your Shopify admin.

### 2. Set Your COGS
Enter cost of goods sold per product, or set a default margin % for quick setup.

### 3. See Your Profit
That's it. Orders sync automatically and you'll see your true profit instantly.

---

## For Developers

### Local Development

```bash
cd profitpulse
npm install
npm run dev
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in:
- `SHOPIFY_API_KEY` - from Shopify Partners
- `SHOPIFY_API_SECRET` - from Shopify Partners
- `NEXT_PUBLIC_SUPABASE_URL` - from Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - from Supabase
- `NEXT_PUBLIC_APP_URL` - your deployment URL

### Tech Stack
- Next.js 16 + React 19
- Tailwind CSS v4
- Supabase (PostgreSQL)
- Shopify App Bridge
- Recharts

### Deploy to Vercel

```bash
vercel
```

Or connect your GitHub repo for auto-deploys.

---

## Database Schema

See `supabase_schema.sql` for full schema. Key tables:
- `stores` - Shopify stores with access tokens
- `store_settings` - Default COGS %, fee rates
- `products` - Product-level COGS
- `orders` - Orders with profit calculations
- `order_line_items` - Item-level profit breakdown

---

## Profit Calculation

```
Revenue = subtotal_price
COGS = sum of (quantity * cost_per_item) for all line items
Payment Fee = (total_price * processing_rate) + fixed_fee
Shopify Fee = total_price * shopify_plan_rate
Net Profit = Revenue - COGS - Payment Fee - Shopify Fee - Shipping
Margin = (Net Profit / Revenue) * 100
```

---

## Support

Questions? Contact: adam@argora.ai
