# ProfitPulse - Shopify Profit Tracking App

## ⚠️ CURRENT STATUS (March 2026)

**STATUS: WAITING FOR SHOPIFY APP STORE APPROVAL**

Once approved, this becomes the #1 priority product:
- Shopify App Store = built-in distribution (customers find you)
- TAM: 2M+ Shopify stores, many searching "profit" daily
- Competition: BeProfit ($49-249), TrueProfit ($25-99) - we're cheaper at $29.99

**When approved:**
1. Switch content engine to ProfitPulse topics
2. Edit `/Users/adam/content-engine/src/config/products/profitpulse.ts` → set `weight: 1.0`
3. Edit `/Users/adam/content-engine/src/config/products/stello.ts` → set `weight: 0.0`
4. Daily YouTube shorts will auto-switch to ProfitPulse content

---

## Product Overview

**Tagline:** "Revenue is vanity. Profit is sanity."

**What it does:**
- Shows true profit per Shopify order (not just revenue)
- Tracks COGS, payment fees, Shopify fees, shipping
- Product-level profitability analysis
- Daily/weekly/monthly profit trends

**Pricing:** $29.99/month with 7-day free trial

**Target customer:**
- Shopify store owners who want to know real margins
- Stores doing $10k-$500k/month who've never tracked COGS properly
- Merchants frustrated with complex/expensive alternatives

---

## Tech Stack

- Next.js 16 + React 19
- Tailwind CSS v4
- Supabase (PostgreSQL)
- Shopify App Bridge (embedded app)
- Recharts (charts)

---

## Key Files

- `/app/page.tsx` - Main dashboard
- `/app/api/webhooks/shopify/orders/route.ts` - Order sync webhook
- `/app/api/products/route.ts` - Product COGS management
- `/app/api/settings/route.ts` - Store settings (fees, default margin)
- `/lib/shopify-app-bridge.ts` - Shopify integration

---

## Content Engine Topics Ready

ProfitPulse topics are pre-loaded in content engine:
- **~80 topics** → YouTube Shorts (60 sec daily videos)
- **~50 video ideas** → Longer YouTube videos (5-7 min weekly)
- Shopify-specific hashtags and keywords
- Shopify-specific prompts in content generator

**When approved, switch content engine:**
```bash
# Step 1: Edit src/config/products/stello.ts
weight: 0.0  # Was 1.0

# Step 2: Edit src/config/products/profitpulse.ts
weight: 1.0  # Was 0.0

# Step 3: Clear used topics for fresh start
rm data/used-topics.json
```

Daily YouTube Shorts will automatically switch to ProfitPulse content.
