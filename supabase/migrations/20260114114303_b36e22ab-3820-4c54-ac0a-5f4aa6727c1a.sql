-- Create/Replace Trial conversion views

-- 1. Trial conversations dataset
DROP VIEW IF EXISTS public.v_finetune_conversations CASCADE;

CREATE VIEW public.v_finetune_conversations AS
SELECT 
  te.id,
  te.session_id,
  te.label,
  te.prompt_variant,
  te.messages,
  jsonb_build_object(
    'country', COALESCE(ts.user_country, p.country),
    'city', COALESCE(ts.user_city, p.city),
    'birth_year', COALESCE(ts.user_birth_year, p.birth_year),
    'age', EXTRACT(YEAR FROM CURRENT_DATE)::INT - COALESCE(ts.user_birth_year, p.birth_year, 0),
    'gender', COALESCE(ts.user_gender, p.gender_extended),
    'timezone', COALESCE(ts.user_timezone, p.timezone),
    'onboarding_goals', COALESCE(ts.user_onboarding_state, p.onboarding_state)->'goals',
    'onboarding_state', COALESCE(ts.user_onboarding_state, p.onboarding_state)->'state',
    'onboarding_symptoms', COALESCE(ts.user_onboarding_state, p.onboarding_state)->'symptoms',
    'days_since_registration', COALESCE(ts.days_since_registration, EXTRACT(DAY FROM ts.started_at - p.created_at)::INT),
    'session_duration_sec', ts.session_duration_sec,
    'messages_count', ts.messages_count,
    'dominant_emotion', ts.dominant_emotion,
    'emotion_trajectory', ts.emotion_trajectory,
    'crisis_detected', ts.crisis_detected,
    'had_previous_trial', (p.trial_started_at IS NOT NULL AND p.trial_started_at < ts.started_at),
    'trial_days_used', CASE 
      WHEN p.trial_started_at IS NOT NULL 
      THEN EXTRACT(DAY FROM ts.started_at - p.trial_started_at)::INT
      ELSE NULL 
    END
  ) AS user_context,
  te.time_to_conversion_sec,
  te.conversion_quality_score,
  CASE WHEN te.label LIKE 'converted%' THEN 1 ELSE 0 END AS is_positive_example,
  te.created_at
FROM training_examples te
JOIN trial_sessions ts ON ts.id = te.session_id
LEFT JOIN profiles p ON p.user_id = ts.user_id;

-- 2. Trial message pairs dataset
DROP VIEW IF EXISTS public.v_finetune_message_pairs CASCADE;

CREATE VIEW public.v_finetune_message_pairs AS
SELECT 
  tm_user.session_id,
  tm_user.message_number,
  ts.user_id,
  (SELECT jsonb_agg(
    jsonb_build_object('role', prev.role, 'content', prev.content) 
    ORDER BY prev.message_number
  )
  FROM trial_messages prev 
  WHERE prev.session_id = tm_user.session_id 
    AND prev.message_number < tm_user.message_number) AS context,
  tm_user.content AS user_message,
  tm_user.detected_emotion AS user_emotion,
  tm_user.user_intent,
  tm_asst.content AS assistant_response,
  tm_asst.empathy_score,
  tm_asst.cta_softness_score,
  tm_asst.contains_cta_hint,
  jsonb_build_object(
    'country', COALESCE(ts.user_country, p.country),
    'city', COALESCE(ts.user_city, p.city),
    'age', EXTRACT(YEAR FROM CURRENT_DATE)::INT - COALESCE(ts.user_birth_year, p.birth_year, 0),
    'gender', COALESCE(ts.user_gender, p.gender_extended),
    'onboarding_goals', COALESCE(ts.user_onboarding_state, p.onboarding_state)->'goals',
    'onboarding_state', COALESCE(ts.user_onboarding_state, p.onboarding_state)->'state',
    'days_since_registration', COALESCE(ts.days_since_registration, EXTRACT(DAY FROM ts.started_at - p.created_at)::INT)
  ) AS user_profile,
  CASE 
    WHEN ts.purchased_at IS NOT NULL AND tm_asst.message_number = ts.messages_count 
    THEN 'conversion_trigger'
    WHEN ts.purchased_at IS NOT NULL THEN 'positive_path'
    ELSE 'negative_path'
  END AS pair_label,
  ts.plan_purchased,
  ts.purchased_at IS NOT NULL AS converted
FROM trial_messages tm_user
JOIN trial_messages tm_asst ON tm_asst.session_id = tm_user.session_id 
  AND tm_asst.message_number = tm_user.message_number + 1 
  AND tm_asst.role = 'assistant'
JOIN trial_sessions ts ON ts.id = tm_user.session_id
LEFT JOIN profiles p ON p.user_id = ts.user_id
WHERE tm_user.role = 'user';

-- Grant access
GRANT SELECT ON public.v_finetune_conversations TO authenticated;
GRANT SELECT ON public.v_finetune_message_pairs TO authenticated;