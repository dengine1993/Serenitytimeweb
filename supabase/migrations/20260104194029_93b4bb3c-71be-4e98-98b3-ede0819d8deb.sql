-- Add AI cost limit config if not exists
INSERT INTO app_config (key, value)
VALUES ('ai_daily_cost_limit', '500')
ON CONFLICT (key) DO NOTHING;

-- Enable pg_cron and pg_net for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;