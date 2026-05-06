-- 1. Hot-path indices for ai_chats / ai_messages
CREATE INDEX IF NOT EXISTS idx_ai_messages_user_role_created
  ON public.ai_messages(user_id, role, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_messages_chat_user_created
  ON public.ai_messages(chat_id, user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_ai_chats_user_updated
  ON public.ai_chats(user_id, updated_at DESC);

-- 2. feature_usage: explicit deny for direct writes from authenticated role.
DROP POLICY IF EXISTS "Block direct inserts on feature_usage" ON public.feature_usage;
CREATE POLICY "Block direct inserts on feature_usage"
  ON public.feature_usage FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Block direct updates on feature_usage" ON public.feature_usage;
CREATE POLICY "Block direct updates on feature_usage"
  ON public.feature_usage FOR UPDATE TO authenticated
  USING (false);

DROP POLICY IF EXISTS "Block direct deletes on feature_usage" ON public.feature_usage;
CREATE POLICY "Block direct deletes on feature_usage"
  ON public.feature_usage FOR DELETE TO authenticated
  USING (false);

-- 3. Safe atomic decrement (rollback when LLM call fails)
CREATE OR REPLACE FUNCTION public.decrement_feature_usage(
  p_user_id uuid,
  p_feature text,
  p_usage_date date
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.feature_usage
  SET daily_count   = GREATEST(0, daily_count - 1),
      monthly_count = GREATEST(0, COALESCE(monthly_count, 0) - 1),
      updated_at    = now()
  WHERE user_id = p_user_id
    AND feature = p_feature
    AND usage_date = p_usage_date;
$$;

-- 4. Race-free trial start/increment for free users in the feed.
CREATE OR REPLACE FUNCTION public.start_or_increment_jiva_trial(
  p_user_id uuid,
  p_post_id uuid,
  p_usage_date date,
  p_limit int
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_feature text := 'jiva_trial:' || p_post_id::text;
  v_existing text;
  v_count int;
BEGIN
  PERFORM 1
  FROM public.feature_usage
  WHERE user_id = p_user_id
    AND feature LIKE 'jiva_trial:%'
  FOR UPDATE;

  SELECT feature INTO v_existing
  FROM public.feature_usage
  WHERE user_id = p_user_id
    AND feature LIKE 'jiva_trial:%'
    AND feature <> v_feature
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'OTHER_POST',
      'trialPostId', replace(v_existing, 'jiva_trial:', '')
    );
  END IF;

  INSERT INTO public.feature_usage (user_id, feature, usage_date, daily_count, monthly_count)
  VALUES (p_user_id, v_feature, p_usage_date, 1, 1)
  ON CONFLICT (user_id, feature, usage_date)
  DO UPDATE
    SET daily_count   = feature_usage.daily_count + 1,
        monthly_count = COALESCE(feature_usage.monthly_count, 0) + 1,
        updated_at    = now()
    WHERE feature_usage.daily_count < p_limit
  RETURNING daily_count INTO v_count;

  IF v_count IS NULL THEN
    SELECT daily_count INTO v_count
    FROM public.feature_usage
    WHERE user_id = p_user_id
      AND feature = v_feature
      AND usage_date = p_usage_date;

    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'TRIAL_LIMIT',
      'count', COALESCE(v_count, 0),
      'limit', p_limit
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'new_count', v_count,
    'remaining', GREATEST(0, p_limit - v_count),
    'limit', p_limit
  );
END;
$$;