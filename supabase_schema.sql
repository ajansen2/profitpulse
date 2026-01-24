-- ProfitPulse Supabase Schema
-- Run this in your Supabase SQL Editor to create all tables

-- ============================================
-- STORES TABLE
-- Main table linking Shopify stores
-- ============================================
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_domain TEXT UNIQUE NOT NULL,
  store_name TEXT,
  email TEXT,
  access_token TEXT NOT NULL,
  scope TEXT,
  subscription_status TEXT DEFAULT 'trial',
  billing_charge_id TEXT,
  trial_ends_at TIMESTAMPTZ,
  currency TEXT DEFAULT 'USD',
  timezone TEXT DEFAULT 'America/New_York',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STORE SETTINGS TABLE
-- Fee rates and defaults per store
-- ============================================
CREATE TABLE IF NOT EXISTS store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE UNIQUE,
  default_cogs_percentage DECIMAL(5,2) DEFAULT 30,
  default_shipping_cost DECIMAL(10,2) DEFAULT 0,
  payment_processing_rate DECIMAL(5,4) DEFAULT 0.029,
  payment_processing_fixed DECIMAL(10,2) DEFAULT 0.30,
  shopify_plan TEXT DEFAULT 'basic',
  shopify_fee_rate DECIMAL(5,4) DEFAULT 0.02,
  include_taxes_in_revenue BOOLEAN DEFAULT false,
  include_shipping_in_revenue BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PRODUCTS TABLE
-- COGS tracking per product/variant
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  shopify_product_id TEXT NOT NULL,
  shopify_variant_id TEXT,
  title TEXT,
  sku TEXT,
  cost_per_item DECIMAL(10,2) DEFAULT 0,
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  handling_cost DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, shopify_variant_id)
);

-- ============================================
-- ORDERS TABLE
-- Orders with profit calculations
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  shopify_order_id TEXT NOT NULL,
  order_number TEXT,
  customer_email TEXT,
  subtotal_price DECIMAL(10,2),
  total_price DECIMAL(10,2),
  total_tax DECIMAL(10,2),
  total_shipping DECIMAL(10,2),
  total_discounts DECIMAL(10,2),
  currency TEXT,
  financial_status TEXT,
  fulfillment_status TEXT,
  -- Calculated costs
  total_cogs DECIMAL(10,2) DEFAULT 0,
  total_shipping_cost DECIMAL(10,2) DEFAULT 0,
  payment_processing_fee DECIMAL(10,2) DEFAULT 0,
  shopify_fee DECIMAL(10,2) DEFAULT 0,
  -- Profit calculations
  gross_profit DECIMAL(10,2) DEFAULT 0,
  net_profit DECIMAL(10,2) DEFAULT 0,
  profit_margin DECIMAL(5,2) DEFAULT 0,
  -- Attribution
  attributed_platform TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  ad_cost DECIMAL(10,2) DEFAULT 0,
  -- Timestamps
  order_created_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, shopify_order_id)
);

-- ============================================
-- ORDER LINE ITEMS TABLE
-- Item-level profit tracking
-- ============================================
CREATE TABLE IF NOT EXISTS order_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  shopify_line_item_id TEXT NOT NULL,
  shopify_product_id TEXT,
  shopify_variant_id TEXT,
  title TEXT,
  quantity INTEGER,
  price DECIMAL(10,2),
  total_price DECIMAL(10,2),
  cost_per_item DECIMAL(10,2) DEFAULT 0,
  total_cost DECIMAL(10,2) DEFAULT 0,
  profit DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AD SPEND TABLE
-- Daily ad spend aggregates
-- ============================================
CREATE TABLE IF NOT EXISTS ad_spend (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  platform TEXT NOT NULL,
  campaign_id TEXT,
  campaign_name TEXT,
  ad_set_id TEXT,
  ad_set_name TEXT,
  spend DECIMAL(10,2) DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, date, platform, campaign_id)
);

-- ============================================
-- AD CONNECTIONS TABLE
-- Connected ad platform accounts
-- ============================================
CREATE TABLE IF NOT EXISTS ad_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  account_id TEXT,
  account_name TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, platform)
);

-- ============================================
-- INSIGHTS TABLE
-- AI-generated profit insights
-- ============================================
CREATE TABLE IF NOT EXISTS insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  insight_type TEXT,
  title TEXT,
  content TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- For query performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_stores_shop_domain ON stores(shop_domain);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_created_at ON orders(order_created_at);
CREATE INDEX IF NOT EXISTS idx_orders_store_created ON orders(store_id, order_created_at);
CREATE INDEX IF NOT EXISTS idx_order_line_items_order_id ON order_line_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_line_items_store_id ON order_line_items(store_id);
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_variant ON products(store_id, shopify_variant_id);
CREATE INDEX IF NOT EXISTS idx_ad_spend_store_date ON ad_spend(store_id, date);
CREATE INDEX IF NOT EXISTS idx_insights_store_id ON insights(store_id);

-- ============================================
-- ROW LEVEL SECURITY
-- Enable RLS (policies are bypassed by service role)
-- ============================================
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_spend ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DONE!
-- Your ProfitPulse database is ready
-- ============================================
