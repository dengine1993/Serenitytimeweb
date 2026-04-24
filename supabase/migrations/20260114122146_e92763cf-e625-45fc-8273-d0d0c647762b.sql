-- =============================================
-- 1. Add new columns to training_examples
-- =============================================
ALTER TABLE public.training_examples 
ADD COLUMN IF NOT EXISTS cta_clicked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS cta_clicked_at timestamptz,
ADD COLUMN IF NOT EXISTS purchased_within_1h boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS third_ai_message_at timestamptz,
ADD COLUMN IF NOT EXISTS user_context jsonb DEFAULT '{}';

-- =============================================
-- 2. Add third_ai_message_at to trial_sessions
-- =============================================
ALTER TABLE public.trial_sessions 
ADD COLUMN IF NOT EXISTS third_ai_message_at timestamptz,
ADD COLUMN IF NOT EXISTS cta_clicked_at timestamptz;

-- =============================================
-- 3. Create scheduled_finalizations table
-- =============================================
CREATE TABLE IF NOT EXISTS public.scheduled_finalizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.trial_sessions(id) ON DELETE CASCADE,
  scheduled_for timestamptz NOT NULL,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(session_id)
);

-- Index for cron job query
CREATE INDEX IF NOT EXISTS idx_scheduled_finalizations_pending 
ON public.scheduled_finalizations(scheduled_for) 
WHERE processed_at IS NULL;

-- RLS (service role only)
ALTER TABLE public.scheduled_finalizations ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. Update v_finetune_conversations view
-- =============================================
DROP VIEW IF EXISTS public.v_finetune_conversations;

CREATE OR REPLACE VIEW public.v_finetune_conversations AS
SELECT 
  te.id,
  te.session_id,
  te.messages,
  te.label,
  te.prompt_variant,
  te.session_started_at,
  te.session_ended_at,
  te.converted_at,
  te.time_to_conversion_sec,
  te.conversion_quality_score,
  te.cta_clicked,
  te.cta_clicked_at,
  te.purchased_within_1h,
  te.third_ai_message_at,
  te.user_context,
  ts.user_country,
  ts.user_city,
  ts.user_birth_year,
  ts.user_gender,
  ts.user_timezone,
  ts.user_onboarding_state,
  ts.messages_count,
  ts.crisis_detected,
  ts.dominant_emotion,
  te.created_at
FROM public.training_examples te
LEFT JOIN public.trial_sessions ts ON te.session_id = ts.id
WHERE te.label IS NOT NULL
ORDER BY te.created_at DESC;

-- Grant access to authenticated users (admins will use this)
GRANT SELECT ON public.v_finetune_conversations TO authenticated;

-- =============================================
-- 5. Drop old trigger (will be replaced with cron)
-- =============================================
DROP TRIGGER IF EXISTS on_trial_session_finalized ON public.trial_sessions;
DROP FUNCTION IF EXISTS public.trigger_finalize_trial_session();