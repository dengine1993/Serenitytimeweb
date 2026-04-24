-- Create unified is_premium function
-- This replaces duplicate inline checks across edge functions
CREATE OR REPLACE FUNCTION public.is_premium(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT (
        p.plan = 'premium'
        OR (p.premium_until IS NOT NULL AND p.premium_until > now())
      )
      FROM public.profiles p
      WHERE p.user_id = p_user_id
    ),
    false
  )
$$;