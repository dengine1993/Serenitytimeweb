-- Force drop and recreate empathy view
DROP VIEW IF EXISTS public.v_empathy_training_dataset CASCADE;

CREATE VIEW public.v_empathy_training_dataset AS
SELECT 
  se.id AS evaluation_id,
  se.user_id,
  se.session_date,
  se.session_quality,
  se.empathy_score,
  se.user_progress,
  se.messages_count,
  (rating_data->>'message_index')::int AS message_index,
  rating_data->>'rating' AS rating,
  rating_data->>'reason' AS reason,
  se.user_country,
  se.user_city,
  se.user_birth_year,
  EXTRACT(YEAR FROM CURRENT_DATE)::INT - COALESCE(se.user_birth_year, 0) AS user_age,
  se.user_gender,
  se.user_timezone,
  se.user_onboarding_state,
  se.days_since_registration,
  p.plan AS current_plan,
  (SELECT COUNT(*) FROM session_evaluations prev 
   WHERE prev.user_id = se.user_id AND prev.session_date < se.session_date) AS sessions_before,
  se.conversation_json,
  se.improvement_areas,
  se.ai_reasoning,
  se.summary,
  se.model_used,
  se.tokens_used,
  se.evaluated_at
FROM session_evaluations se
CROSS JOIN LATERAL jsonb_array_elements(se.message_ratings) AS rating_data
LEFT JOIN profiles p ON p.user_id = se.user_id
WHERE se.evaluated_at IS NOT NULL;

GRANT SELECT ON public.v_empathy_training_dataset TO authenticated;