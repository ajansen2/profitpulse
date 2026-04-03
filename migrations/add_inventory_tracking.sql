-- Add inventory tracking to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS inventory_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS inventory_updated_at TIMESTAMPTZ;

-- Add low stock alerts settings to store_settings
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS low_stock_alerts_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS low_stock_sms_enabled BOOLEAN DEFAULT false;
