-- Add SMS notification settings to store_settings table
-- Run this migration in Supabase SQL Editor

ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sms_phone_number TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sms_daily_digest BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sms_profit_alerts BOOLEAN DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN store_settings.sms_enabled IS 'Whether SMS notifications are enabled for this store';
COMMENT ON COLUMN store_settings.sms_phone_number IS 'Phone number for SMS notifications (with country code)';
COMMENT ON COLUMN store_settings.sms_daily_digest IS 'Whether to send daily profit digest via SMS';
COMMENT ON COLUMN store_settings.sms_profit_alerts IS 'Whether to send low profit alerts via SMS';
