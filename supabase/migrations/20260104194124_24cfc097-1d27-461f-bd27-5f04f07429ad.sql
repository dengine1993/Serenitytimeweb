-- Schedule hourly check for AI cost limits
SELECT cron.schedule(
  'check-ai-cost-limit-hourly',
  '0 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://hvtpfbfawhmkvjtcyaxs.supabase.co/functions/v1/check-ai-cost-limit',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2dHBmYmZhd2hta3ZqdGN5YXhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4OTU4MjYsImV4cCI6MjA4MjQ3MTgyNn0.sYmL5RFcgfVH3EExftCjEWRv6ctZh5QxB6KWcGxVYrA'
        ),
        body:='{}'::jsonb
    ) as request_id;
  $$
);