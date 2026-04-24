-- Add auto_renew column (default true for monthly, will be set to false for yearly)
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS auto_renew boolean DEFAULT true;

-- Add billing_interval column to distinguish monthly vs yearly
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS billing_interval text DEFAULT 'month';

-- Add comment for clarity
COMMENT ON COLUMN subscriptions.auto_renew IS 'Auto-renewal enabled (only for monthly subscriptions)';
COMMENT ON COLUMN subscriptions.billing_interval IS 'Billing interval: month or year';