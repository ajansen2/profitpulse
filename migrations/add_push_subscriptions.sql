-- Push notification subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, endpoint)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_store_id ON push_subscriptions(store_id);

-- Add sharing links table for profit sharing feature
CREATE TABLE IF NOT EXISTS share_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  name TEXT, -- e.g., "Accountant", "Partner"
  permissions JSONB DEFAULT '{"viewDashboard": true, "viewProducts": false, "viewOrders": false}'::jsonb,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ
);

-- Index for token lookups
CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);
CREATE INDEX IF NOT EXISTS idx_share_links_store_id ON share_links(store_id);
