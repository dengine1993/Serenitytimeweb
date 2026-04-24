-- Insert configuration for auto-comment trigger
INSERT INTO app_config (key, value) VALUES 
  ('supabase_url', 'https://hvtpfbfawhmkvjtcyaxs.supabase.co')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Get internal_function_secret from vault and insert
-- Note: We need to reference the secret that's already in Supabase secrets
INSERT INTO app_config (key, value) 
SELECT 'internal_function_secret', current_setting('app.settings.internal_function_secret', true)
WHERE current_setting('app.settings.internal_function_secret', true) IS NOT NULL
ON CONFLICT (key) DO NOTHING;