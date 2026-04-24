-- Fix CRITICAL security issue: internal_function_secret is exposed to all users
-- Drop the overly permissive policy and create a restrictive one

DROP POLICY IF EXISTS "Anyone can read app config" ON public.app_config;

-- Only allow reading non-secret config values
CREATE POLICY "Anyone can read non-secret config" ON public.app_config
FOR SELECT USING (key NOT ILIKE '%secret%');

-- Admins can read all config including secrets (for debugging)
CREATE POLICY "Admins can read all config" ON public.app_config
FOR SELECT USING (public.is_admin());