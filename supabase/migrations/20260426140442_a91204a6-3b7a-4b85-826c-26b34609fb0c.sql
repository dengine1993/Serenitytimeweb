-- Удаляем старое расписание с таким же именем (если было) и создаём заново
DO $$
BEGIN
  PERFORM cron.unschedule('jiva-ingest-worker-5min');
EXCEPTION WHEN OTHERS THEN
  -- задача не существует — ок
  NULL;
END $$;

SELECT cron.schedule(
  'jiva-ingest-worker-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://hvtpfbfawhmkvjtcyaxs.supabase.co/functions/v1/jiva-ingest-worker',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2dHBmYmZhd2hta3ZqdGN5YXhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4OTU4MjYsImV4cCI6MjA4MjQ3MTgyNn0.sYmL5RFcgfVH3EExftCjEWRv6ctZh5QxB6KWcGxVYrA"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);