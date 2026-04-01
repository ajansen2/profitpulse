-- Migration: Add new settings columns for dashboard widgets, flow automation, and more
-- Run this in your Supabase SQL Editor

-- Add dashboard widget preferences
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS dashboard_widgets JSONB DEFAULT NULL;

-- Add flow automation settings
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS flow_webhook_url TEXT DEFAULT NULL;

ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS flow_triggers_enabled BOOLEAN DEFAULT false;

ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS flow_trigger_types TEXT[] DEFAULT ARRAY['order.unprofitable'];

-- Add notification settings (if not already present)
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS notification_email TEXT DEFAULT NULL;

ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS email_daily_digest BOOLEAN DEFAULT true;

ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS email_weekly_summary BOOLEAN DEFAULT true;

ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS email_profit_alerts BOOLEAN DEFAULT true;

ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS email_alert_threshold DECIMAL(10,2) DEFAULT 0;

ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS slack_webhook_url TEXT DEFAULT NULL;

ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS discord_webhook_url TEXT DEFAULT NULL;

ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS profit_goal_daily DECIMAL(10,2) DEFAULT NULL;

ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS profit_goal_monthly DECIMAL(10,2) DEFAULT NULL;

ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- Success message
SELECT 'Migration completed successfully! All new columns have been added.' as message;
