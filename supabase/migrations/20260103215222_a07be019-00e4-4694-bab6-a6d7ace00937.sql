-- Update check_feature_limit to use user's timezone
CREATE OR REPLACE FUNCTION public.check_feature_limit(p_user_id uuid, p_feature text, p_daily_limit integer, p_monthly_limit integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_timezone text;
  v_user_now timestamptz;
  v_today date;
  v_month_start date;
  v_daily_count integer := 0;
  v_monthly_count integer := 0;
  v_warnings integer := 0;
  v_is_banned boolean := false;
  v_result jsonb;
BEGIN
  -- Get user's timezone (default to Moscow if not set)
  SELECT COALESCE(timezone, 'Europe/Moscow')
  INTO v_timezone
  FROM profiles
  WHERE user_id = p_user_id;
  
  IF v_timezone IS NULL THEN
    v_timezone := 'Europe/Moscow';
  END IF;

  -- Calculate user's local date
  v_user_now := now() AT TIME ZONE v_timezone;
  v_today := v_user_now::date;
  v_month_start := date_trunc('month', v_user_now)::date;

  -- Check if user is soft-banned for this feature
  SELECT 
    p_feature = ANY(soft_banned_features),
    COALESCE(abuse_warnings_count, 0)
  INTO v_is_banned, v_warnings
  FROM profiles
  WHERE user_id = p_user_id;

  IF v_is_banned THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'feature_banned',
      'message', 'Функция заблокирована за нарушение условий использования'
    );
  END IF;

  -- Get today's count (compare in user's timezone)
  SELECT COALESCE(daily_count, 0)
  INTO v_daily_count
  FROM feature_usage
  WHERE user_id = p_user_id 
    AND feature = p_feature 
    AND usage_date = v_today;

  -- Get monthly count (sum of all days this month in user's timezone)
  SELECT COALESCE(SUM(daily_count), 0)
  INTO v_monthly_count
  FROM feature_usage
  WHERE user_id = p_user_id 
    AND feature = p_feature 
    AND usage_date >= v_month_start;

  -- Check limits
  IF v_daily_count >= p_daily_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'daily_limit',
      'daily_count', v_daily_count,
      'daily_limit', p_daily_limit,
      'message', 'Превышен суточный лимит. Попробуйте завтра.'
    );
  END IF;

  IF v_monthly_count >= p_monthly_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'monthly_limit',
      'monthly_count', v_monthly_count,
      'monthly_limit', p_monthly_limit,
      'message', 'Превышен месячный лимит разумного использования. Подробности в оферте.'
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'daily_count', v_daily_count,
    'monthly_count', v_monthly_count,
    'daily_remaining', p_daily_limit - v_daily_count,
    'monthly_remaining', p_monthly_limit - v_monthly_count
  );
END;
$function$;

-- Update increment_feature_usage to use user's timezone
CREATE OR REPLACE FUNCTION public.increment_feature_usage(p_user_id uuid, p_feature text, p_daily_limit integer, p_monthly_limit integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_timezone text;
  v_user_now timestamptz;
  v_today date;
  v_month_start date;
  v_daily_count integer;
  v_monthly_count integer;
  v_warnings integer;
BEGIN
  -- Get user's timezone (default to Moscow if not set)
  SELECT COALESCE(timezone, 'Europe/Moscow')
  INTO v_timezone
  FROM profiles
  WHERE user_id = p_user_id;
  
  IF v_timezone IS NULL THEN
    v_timezone := 'Europe/Moscow';
  END IF;

  -- Calculate user's local date
  v_user_now := now() AT TIME ZONE v_timezone;
  v_today := v_user_now::date;
  v_month_start := date_trunc('month', v_user_now)::date;

  -- Upsert today's record (in user's local date)
  INSERT INTO feature_usage (user_id, feature, usage_date, daily_count)
  VALUES (p_user_id, p_feature, v_today, 1)
  ON CONFLICT (user_id, feature, usage_date)
  DO UPDATE SET 
    daily_count = feature_usage.daily_count + 1,
    updated_at = now()
  RETURNING daily_count INTO v_daily_count;

  -- Get monthly total
  SELECT COALESCE(SUM(daily_count), 0)
  INTO v_monthly_count
  FROM feature_usage
  WHERE user_id = p_user_id 
    AND feature = p_feature 
    AND usage_date >= v_month_start;

  -- Check for abuse patterns (exceeding 80% of limits consistently)
  IF v_daily_count > (p_daily_limit * 0.8) OR v_monthly_count > (p_monthly_limit * 0.8) THEN
    -- Increment warnings
    UPDATE profiles 
    SET abuse_warnings_count = COALESCE(abuse_warnings_count, 0) + 1
    WHERE user_id = p_user_id
    RETURNING abuse_warnings_count INTO v_warnings;

    -- Auto-ban after 3 warnings at 80%+ usage
    IF v_warnings >= 3 THEN
      UPDATE profiles 
      SET soft_banned_features = array_append(
        COALESCE(soft_banned_features, '{}'), 
        p_feature
      )
      WHERE user_id = p_user_id
        AND NOT (p_feature = ANY(COALESCE(soft_banned_features, '{}')));
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'daily_count', v_daily_count,
    'monthly_count', v_monthly_count
  );
END;
$function$;