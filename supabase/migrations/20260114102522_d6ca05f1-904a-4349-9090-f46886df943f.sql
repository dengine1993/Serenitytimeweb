-- ================================================
-- STEP 1: Drop dependencies first
-- ================================================
DROP VIEW IF EXISTS public.v_empathy_training_dataset;
DROP TRIGGER IF EXISTS trg_update_previous_feedback ON public.researcher_messages;

-- ================================================
-- STEP 2: Create session_evaluations table
-- ================================================
CREATE TABLE IF NOT EXISTS public.session_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_date DATE NOT NULL,
  
  -- Input data
  messages_count INT NOT NULL DEFAULT 0,
  conversation_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- AI evaluation results
  session_quality DECIMAL(3,2),
  empathy_score DECIMAL(3,2),
  user_progress TEXT,
  
  -- Per-message ratings
  message_ratings JSONB DEFAULT '[]'::jsonb,
  helpful_message_ids UUID[] DEFAULT '{}',
  problematic_message_ids UUID[] DEFAULT '{}',
  felt_judged_message_ids UUID[] DEFAULT '{}',
  
  -- Improvement insights
  improvement_areas TEXT[] DEFAULT '{}',
  ai_reasoning TEXT,
  summary TEXT,
  
  -- Metadata
  model_used TEXT DEFAULT 'x-ai/grok-4',
  tokens_used INT,
  evaluation_cost_usd DECIMAL(10,6),
  evaluated_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT session_evaluations_user_date_unique UNIQUE(user_id, session_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_session_evaluations_user_id ON public.session_evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_session_evaluations_session_date ON public.session_evaluations(session_date);
CREATE INDEX IF NOT EXISTS idx_session_evaluations_pending ON public.session_evaluations(user_id) WHERE evaluated_at IS NULL;

-- RLS
ALTER TABLE public.session_evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own evaluations" ON public.session_evaluations;
CREATE POLICY "Users can view own evaluations"
  ON public.session_evaluations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access evaluations" ON public.session_evaluations;
CREATE POLICY "Service role full access evaluations"
  ON public.session_evaluations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ================================================
-- STEP 3: Modify empathy_feedback
-- ================================================
ALTER TABLE public.empathy_feedback 
  DROP COLUMN IF EXISTS explicit_rating,
  DROP COLUMN IF EXISTS explicit_reason,
  DROP COLUMN IF EXISTS explicit_details,
  DROP COLUMN IF EXISTS explicit_feedback_at,
  DROP COLUMN IF EXISTS time_to_feedback_sec;

ALTER TABLE public.empathy_feedback
  ADD COLUMN IF NOT EXISTS evaluation_id UUID REFERENCES public.session_evaluations(id),
  ADD COLUMN IF NOT EXISTS ai_rating TEXT,
  ADD COLUMN IF NOT EXISTS ai_confidence DECIMAL(3,2);

-- ================================================
-- STEP 4: Create new view
-- ================================================
CREATE OR REPLACE VIEW public.v_empathy_training_dataset AS
WITH message_ratings_expanded AS (
  SELECT 
    se.id AS evaluation_id,
    se.user_id,
    se.session_date,
    se.session_quality,
    se.empathy_score,
    se.user_progress,
    se.messages_count,
    se.model_used,
    se.evaluated_at,
    jsonb_array_elements(se.message_ratings) AS rating_data,
    se.conversation_json
  FROM public.session_evaluations se
  WHERE se.evaluated_at IS NOT NULL
    AND se.session_quality IS NOT NULL
)
SELECT 
  evaluation_id,
  user_id,
  session_date,
  session_quality,
  empathy_score,
  user_progress,
  messages_count,
  (rating_data->>'message_id')::uuid AS message_id,
  (rating_data->>'message_index')::int AS message_index,
  rating_data->>'rating' AS rating,
  rating_data->>'reason' AS reason,
  conversation_json,
  model_used,
  evaluated_at
FROM message_ratings_expanded;

GRANT SELECT ON public.v_empathy_training_dataset TO authenticated;
GRANT SELECT ON public.v_empathy_training_dataset TO service_role;

-- ================================================
-- STEP 5: Timestamp trigger
-- ================================================
CREATE OR REPLACE FUNCTION public.update_session_evaluation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_session_evaluation_updated ON public.session_evaluations;
CREATE TRIGGER trg_session_evaluation_updated
  BEFORE UPDATE ON public.session_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_session_evaluation_timestamp();