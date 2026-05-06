CREATE OR REPLACE FUNCTION public.increment_jiva_reply_usage(
  p_user_id uuid,
  p_feature text,
  p_usage_date date,
  p_limit integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_count integer := 0;
  v_new_count integer;
BEGIN
  -- Atomic upsert with limit check inside a single statement.
  -- ON CONFLICT path increments only if under limit; otherwise returns existing row unchanged.
  INSERT INTO public.feature_usage (user_id, feature, usage_date, daily_count, monthly_count)
  VALUES (p_user_id, p_feature, p_usage_date, 1, 1)
  ON CONFLICT (user_id, feature, usage_date)
  DO UPDATE
    SET daily_count = feature_usage.daily_count + 1,
        monthly_count = COALESCE(feature_usage.monthly_count, 0) + 1,
        updated_at = now()
    WHERE feature_usage.daily_count < p_limit
  RETURNING daily_count INTO v_new_count;

  -- If RETURNING is NULL, the WHERE clause blocked the update -> over limit
  IF v_new_count IS NULL THEN
    SELECT daily_count INTO v_current_count
    FROM public.feature_usage
    WHERE user_id = p_user_id AND feature = p_feature AND usage_date = p_usage_date;

    RETURN jsonb_build_object(
      'allowed', false,
      'new_count', v_current_count,
      'remaining', 0,
      'limit', p_limit
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'new_count', v_new_count,
    'remaining', GREATEST(0, p_limit - v_new_count),
    'limit', p_limit
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_jiva_reply_usage(uuid, text, date, integer) TO authenticated, service_role;