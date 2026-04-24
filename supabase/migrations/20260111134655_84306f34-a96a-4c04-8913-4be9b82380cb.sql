-- Function to get premium user IDs bypassing RLS
CREATE OR REPLACE FUNCTION public.get_premium_user_ids(user_ids uuid[])
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(ARRAY_AGG(DISTINCT user_id), ARRAY[]::uuid[])
  FROM (
    -- Check active subscriptions (any plan except free)
    SELECT user_id FROM subscriptions 
    WHERE user_id = ANY(user_ids)
      AND status = 'active'
      AND plan != 'free'
    UNION
    -- Check premium_until in profiles
    SELECT user_id FROM profiles
    WHERE user_id = ANY(user_ids)
      AND premium_until > NOW()
  ) combined
$$;