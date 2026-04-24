-- Enable pg_cron and pg_net extensions for scheduled function calls
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Schedule subscription expiry reminder to run daily at 10:00 AM Moscow time (07:00 UTC)
SELECT cron.schedule(
  'subscription-expiry-reminder-daily',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://hvtpfbfawhmkvjtcyaxs.supabase.co/functions/v1/subscription-expiry-reminder',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2dHBmYmZhd2hta3ZqdGN5YXhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ2MjQwNTcsImV4cCI6MjA1MDIwMDA1N30.x24VgVCd7lLmCbhb_Khj9nHHZwU91aLebTq1HNxtaho"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);