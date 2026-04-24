-- Fix Function Search Path Mutable for all functions without search_path

-- Fix check_feature_limit
CREATE OR REPLACE FUNCTION public.check_feature_limit(p_user_id uuid, p_feature text, p_daily_limit integer, p_monthly_limit integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  SELECT COALESCE(timezone, 'Europe/Moscow')
  INTO v_timezone
  FROM profiles
  WHERE user_id = p_user_id;
  
  IF v_timezone IS NULL THEN
    v_timezone := 'Europe/Moscow';
  END IF;

  v_user_now := now() AT TIME ZONE v_timezone;
  v_today := v_user_now::date;
  v_month_start := date_trunc('month', v_user_now)::date;

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

  SELECT COALESCE(daily_count, 0)
  INTO v_daily_count
  FROM feature_usage
  WHERE user_id = p_user_id 
    AND feature = p_feature 
    AND usage_date = v_today;

  SELECT COALESCE(SUM(daily_count), 0)
  INTO v_monthly_count
  FROM feature_usage
  WHERE user_id = p_user_id 
    AND feature = p_feature 
    AND usage_date >= v_month_start;

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
$$;

-- Fix increment_feature_usage
CREATE OR REPLACE FUNCTION public.increment_feature_usage(p_user_id uuid, p_feature text, p_daily_limit integer, p_monthly_limit integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_timezone text;
  v_user_now timestamptz;
  v_today date;
  v_month_start date;
  v_daily_count integer;
  v_monthly_count integer;
  v_warnings integer;
BEGIN
  SELECT COALESCE(timezone, 'Europe/Moscow')
  INTO v_timezone
  FROM profiles
  WHERE user_id = p_user_id;
  
  IF v_timezone IS NULL THEN
    v_timezone := 'Europe/Moscow';
  END IF;

  v_user_now := now() AT TIME ZONE v_timezone;
  v_today := v_user_now::date;
  v_month_start := date_trunc('month', v_user_now)::date;

  INSERT INTO feature_usage (user_id, feature, usage_date, daily_count)
  VALUES (p_user_id, p_feature, v_today, 1)
  ON CONFLICT (user_id, feature, usage_date)
  DO UPDATE SET 
    daily_count = feature_usage.daily_count + 1,
    updated_at = now()
  RETURNING daily_count INTO v_daily_count;

  SELECT COALESCE(SUM(daily_count), 0)
  INTO v_monthly_count
  FROM feature_usage
  WHERE user_id = p_user_id 
    AND feature = p_feature 
    AND usage_date >= v_month_start;

  IF v_daily_count > (p_daily_limit * 0.8) OR v_monthly_count > (p_monthly_limit * 0.8) THEN
    UPDATE profiles 
    SET abuse_warnings_count = COALESCE(abuse_warnings_count, 0) + 1
    WHERE user_id = p_user_id
    RETURNING abuse_warnings_count INTO v_warnings;

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
$$;

-- Fix trigger_auto_comment_on_post
CREATE OR REPLACE FUNCTION public.trigger_auto_comment_on_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supabase_url text;
  internal_secret text;
BEGIN
  SELECT value INTO supabase_url FROM app_config WHERE key = 'supabase_url';
  SELECT value INTO internal_secret FROM app_config WHERE key = 'internal_function_secret';
  
  IF supabase_url IS NULL THEN
    supabase_url := 'https://hvtpfbfawhmkvjtcyaxs.supabase.co';
  END IF;
  
  IF internal_secret IS NOT NULL THEN
    PERFORM extensions.http_post(
      url := supabase_url || '/functions/v1/auto-comment-post',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Internal-Secret', internal_secret
      ),
      body := jsonb_build_object(
        'postId', NEW.id::text,
        'postContent', NEW.content
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;