-- Create feature_usage table for tracking daily/monthly usage and abuse detection
CREATE TABLE IF NOT EXISTS public.feature_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feature text NOT NULL, -- 'ai_chat' or 'art_analysis'
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  daily_count integer NOT NULL DEFAULT 0,
  monthly_count integer NOT NULL DEFAULT 0,
  warnings_count integer NOT NULL DEFAULT 0,
  last_warning_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, feature, usage_date)
);

-- Enable RLS
ALTER TABLE public.feature_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view their own feature usage"
  ON public.feature_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all (edge functions use service role)
-- No INSERT/UPDATE policy for regular users - only edge functions can update

-- Create index for fast lookups
CREATE INDEX idx_feature_usage_user_date ON public.feature_usage(user_id, feature, usage_date);
CREATE INDEX idx_feature_usage_monthly ON public.feature_usage(user_id, feature, usage_date DESC);

-- Add soft_banned column to profiles for feature-level bans
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS soft_banned_features text[] DEFAULT '{}';

-- Add last abuse warning timestamp
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS abuse_warnings_count integer DEFAULT 0;

-- Create function to check and update usage limits
CREATE OR REPLACE FUNCTION public.check_feature_limit(
  p_user_id uuid,
  p_feature text,
  p_daily_limit integer,
  p_monthly_limit integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_month_start date := date_trunc('month', CURRENT_DATE)::date;
  v_daily_count integer := 0;
  v_monthly_count integer := 0;
  v_warnings integer := 0;
  v_is_banned boolean := false;
  v_result jsonb;
BEGIN
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

  -- Get today's count
  SELECT COALESCE(daily_count, 0)
  INTO v_daily_count
  FROM feature_usage
  WHERE user_id = p_user_id 
    AND feature = p_feature 
    AND usage_date = v_today;

  -- Get monthly count (sum of all days this month)
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
$$;

-- Create function to increment usage and check for abuse
CREATE OR REPLACE FUNCTION public.increment_feature_usage(
  p_user_id uuid,
  p_feature text,
  p_daily_limit integer,
  p_monthly_limit integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_month_start date := date_trunc('month', CURRENT_DATE)::date;
  v_daily_count integer;
  v_monthly_count integer;
  v_warnings integer;
BEGIN
  -- Upsert today's record
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
$$;