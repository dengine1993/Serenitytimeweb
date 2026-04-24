-- Fix: Change profiles_public view to SECURITY INVOKER (default, but explicit)
-- This ensures RLS of the querying user is applied, not the view creator

DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public 
WITH (security_invoker = true)
AS
SELECT 
  user_id,
  username,
  display_name,
  avatar_url,
  bio,
  gender,
  created_at
FROM public.profiles;

-- Re-grant access
GRANT SELECT ON public.profiles_public TO anon, authenticated;