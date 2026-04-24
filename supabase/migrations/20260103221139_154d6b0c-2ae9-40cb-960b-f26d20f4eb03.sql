-- Add internal_function_secret to app_config
-- This value should match INTERNAL_FUNCTION_SECRET in edge function secrets
-- Using a placeholder that needs to be updated via Supabase Dashboard
INSERT INTO app_config (key, value) VALUES 
  ('internal_function_secret', 'REPLACE_WITH_ACTUAL_SECRET')
ON CONFLICT (key) DO NOTHING;