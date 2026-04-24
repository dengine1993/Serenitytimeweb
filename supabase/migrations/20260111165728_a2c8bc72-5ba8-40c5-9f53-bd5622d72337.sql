-- Function to extend all premium subscriptions by specified hours
CREATE OR REPLACE FUNCTION extend_all_premium_subscriptions(hours_to_add integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  affected_count integer;
BEGIN
  -- Only allow admins to call this function
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  UPDATE subscriptions
  SET 
    current_period_end = COALESCE(current_period_end, now()) + (hours_to_add || ' hours')::interval,
    updated_at = now()
  WHERE status = 'active'
    AND plan = 'premium';
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$;