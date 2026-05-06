-- Remove old job if exists (idempotent rerun)
SELECT cron.unschedule('subscription-charge-recurrent-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'subscription-charge-recurrent-daily');

SELECT cron.schedule(
  'subscription-charge-recurrent-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://hvtpfbfawhmkvjtcyaxs.supabase.co/functions/v1/subscription-charge-recurrent',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'INTERNAL_FUNCTION_SECRET' LIMIT 1)
    ),
    body := jsonb_build_object('triggered_at', now())
  ) AS request_id;
  $$
);