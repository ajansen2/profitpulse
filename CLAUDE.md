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

## Competitive Edge Features (Added April 2026)

Four features to differentiate from TrueProfit/BeProfit:

### 1. Break-Even Calculator Widget
- Shows monthly revenue needed to cover fixed costs
- Progress bar toward break-even
- Orders/day needed calculation
- **Requires:** Expenses to be added in Settings > Expenses

### 2. SMS Alerts via Twilio
- Text message notifications for profit alerts and daily digests
- Settings in: Settings > Alerts > SMS Notifications
- Uses Twilio credentials from argora-voice
- **Files:** `/lib/twilio.ts`, SMS settings in `store_settings` table

### 3. AI Profit Forecasting
- 7-day profit prediction using linear regression
- Claude Haiku generates narrative insights
- **Requires:** 7+ unique days of order history
- **File:** `/app/api/analytics/forecast/route.ts`

### 4. COGS CSV Upload
- Bulk import product costs via CSV (SKU, cost columns)
- Already in Products page > Import CSV button
- **File:** `/app/api/products/import-csv/route.ts`

### Environment Variables for SMS
```
TWILIO_ACCOUNT_SID=REDACTED_TWILIO_SID
TWILIO_AUTH_TOKEN=REDACTED_TWILIO_TOKEN
TWILIO_PHONE_NUMBER=REDACTED_PHONE
```

### Database Migration for SMS
Run in Supabase SQL Editor:
```sql
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sms_phone_number TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sms_daily_digest BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sms_profit_alerts BOOLEAN DEFAULT true;
```

---

## Tech Stack

- Next.js 16 + React 19
- Tailwind CSS v4
- Supabase (PostgreSQL)
- Shopify App Bridge (embedded app)
- Recharts (charts)
- Twilio (SMS notifications)
- Anthropic Claude (AI insights & forecasting)

---

## Key Files

- `/app/page.tsx` - Main entry point
- `/app/components/Dashboard.tsx` - Main dashboard with widgets
- `/app/components/SettingsPage.tsx` - Settings UI (all tabs)
- `/app/api/webhooks/shopify/orders/route.ts` - Order sync webhook + alerts
- `/app/api/analytics/summary/route.ts` - Analytics + break-even calculations
- `/app/api/analytics/forecast/route.ts` - AI profit forecasting
- `/app/api/products/route.ts` - Product COGS management
- `/app/api/settings/route.ts` - Store settings
- `/lib/twilio.ts` - SMS notifications
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
