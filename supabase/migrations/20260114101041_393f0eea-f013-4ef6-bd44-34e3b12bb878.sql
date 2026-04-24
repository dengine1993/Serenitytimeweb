-- ============================================================
-- EMPATHY FEEDBACK SYSTEM v1.0
-- Dataset collection for fine-tuning AI psychologist on empathy
-- Collects both explicit (button clicks) and implicit (behavior) signals
-- ============================================================

-- Create empathy_feedback table
CREATE TABLE IF NOT EXISTS public.empathy_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to the AI message being rated
  message_id UUID NOT NULL REFERENCES public.researcher_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- === EXPLICIT FEEDBACK (user clicked button) ===
  explicit_rating TEXT CHECK (explicit_rating IN ('helpful', 'neutral', 'not_helpful')),
  explicit_reason TEXT CHECK (explicit_reason IN (
    'not_understood', 'too_generic', 'felt_judged', 
    'off_topic', 'too_long', 'too_short', 'other'
  )),
  explicit_details TEXT,
  explicit_feedback_at TIMESTAMPTZ,
  
  -- === INFERRED FEEDBACK (computed from behavior) ===
  inferred_rating TEXT CHECK (inferred_rating IN (
    'helpful', 'neutral', 'not_helpful', 'felt_judged', 'unknown'
  )),
  inferred_confidence DECIMAL(3,2) CHECK (inferred_confidence >= 0 AND inferred_confidence <= 1),
  inferred_signals JSONB DEFAULT '{}',
  
  -- === FINAL LABEL (for ML export) ===
  final_label TEXT CHECK (final_label IN (
    'helpful', 'neutral', 'not_helpful', 'felt_judged', 'unknown'
  )) DEFAULT 'unknown',
  label_source TEXT CHECK (label_source IN ('explicit', 'inferred', 'unknown')) DEFAULT 'unknown',
  
  -- === CONTEXT OF NEXT USER MESSAGE ===
  next_user_message_id UUID,
  next_message_delay_sec INT,
  next_message_length INT,
  next_message_emotion TEXT,
  emotion_delta DECIMAL(3,2),
  
  -- === TEXTUAL PATTERN FLAGS ===
  contains_gratitude BOOLEAN DEFAULT FALSE,
  contains_validation BOOLEAN DEFAULT FALSE,
  contains_insight BOOLEAN DEFAULT FALSE,
  contains_confusion BOOLEAN DEFAULT FALSE,
  contains_rejection BOOLEAN DEFAULT FALSE,
  contains_felt_judged BOOLEAN DEFAULT FALSE,
  contains_topic_continuation BOOLEAN DEFAULT FALSE,
  contains_topic_change BOOLEAN DEFAULT FALSE,
  contains_action_intent BOOLEAN DEFAULT FALSE,
  contains_deepening_question BOOLEAN DEFAULT FALSE,
  
  -- === SESSION METRICS ===
  conversation_length INT,
  messages_after_count INT,
  session_continued BOOLEAN,
  user_returned_within_24h BOOLEAN,
  
  -- === TIMING ===
  time_to_feedback_sec INT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: one feedback per message per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_empathy_feedback_unique 
ON public.empathy_feedback(message_id, user_id);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_empathy_feedback_user ON public.empathy_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_empathy_feedback_final_label ON public.empathy_feedback(final_label);
CREATE INDEX IF NOT EXISTS idx_empathy_feedback_created ON public.empathy_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_empathy_feedback_confidence ON public.empathy_feedback(inferred_confidence DESC) 
  WHERE inferred_confidence IS NOT NULL;

-- Add columns to researcher_messages for ML features
ALTER TABLE public.researcher_messages 
ADD COLUMN IF NOT EXISTS detected_emotion TEXT,
ADD COLUMN IF NOT EXISTS sentiment_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS token_count INT,
ADD COLUMN IF NOT EXISTS response_time_ms INT;

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE public.empathy_feedback ENABLE ROW LEVEL SECURITY;

-- Users can view and create their own feedback
CREATE POLICY "Users can view own feedback"
ON public.empathy_feedback FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own feedback"
ON public.empathy_feedback FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own feedback"
ON public.empathy_feedback FOR UPDATE
USING (auth.uid() = user_id);

-- Service role has full access for ML export
CREATE POLICY "Service role full access"
ON public.empathy_feedback FOR ALL
USING (auth.role() = 'service_role');

-- ============================================================
-- FUNCTION: Compute implicit feedback from next user message
-- ============================================================
CREATE OR REPLACE FUNCTION public.compute_implicit_feedback(
  p_assistant_message_id UUID,
  p_next_user_message_id UUID,
  p_next_message_content TEXT,
  p_next_message_created_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assistant_msg RECORD;
  v_delay_sec INT;
  v_msg_length INT;
  v_score DECIMAL := 0;
  v_confidence DECIMAL := 0;
  v_signals JSONB := '{}';
  v_label TEXT;
  v_lower_content TEXT;
  
  -- Pattern flags
  v_gratitude BOOLEAN := FALSE;
  v_validation BOOLEAN := FALSE;
  v_insight BOOLEAN := FALSE;
  v_confusion BOOLEAN := FALSE;
  v_rejection BOOLEAN := FALSE;
  v_felt_judged BOOLEAN := FALSE;
  v_action_intent BOOLEAN := FALSE;
  v_deepening BOOLEAN := FALSE;
  v_topic_change BOOLEAN := FALSE;
BEGIN
  -- Get assistant message info
  SELECT created_at INTO v_assistant_msg
  FROM researcher_messages
  WHERE id = p_assistant_message_id;
  
  IF v_assistant_msg IS NULL THEN
    RETURN jsonb_build_object('error', 'assistant_message_not_found');
  END IF;
  
  -- Calculate timing
  v_delay_sec := EXTRACT(EPOCH FROM (p_next_message_created_at - v_assistant_msg.created_at))::INT;
  v_msg_length := LENGTH(p_next_message_content);
  v_lower_content := LOWER(p_next_message_content);
  
  -- === DETECT PATTERNS ===
  
  -- Gratitude patterns
  IF v_lower_content ~ '(спасибо|благодарю|помогло|полезно|ценю|круто|класс|супер)' THEN
    v_gratitude := TRUE;
    v_score := v_score + 0.3;
    v_confidence := v_confidence + 0.25;
    v_signals := v_signals || '{"gratitude": true}';
  END IF;
  
  -- Validation patterns
  IF v_lower_content ~ '(да,? точно|именно|верно|правда|согласен|ты прав|это про меня|узнаю себя)' THEN
    v_validation := TRUE;
    v_score := v_score + 0.25;
    v_confidence := v_confidence + 0.2;
    v_signals := v_signals || '{"validation": true}';
  END IF;
  
  -- Insight patterns
  IF v_lower_content ~ '(интересно|не думал|никогда не|новая мысль|в голову не приходило|осознал)' THEN
    v_insight := TRUE;
    v_score := v_score + 0.25;
    v_confidence := v_confidence + 0.2;
    v_signals := v_signals || '{"insight": true}';
  END IF;
  
  -- Action intent patterns
  IF v_lower_content ~ '(попробую|сделаю|буду|начну|решил|планирую|хочу попробовать)' THEN
    v_action_intent := TRUE;
    v_score := v_score + 0.3;
    v_confidence := v_confidence + 0.2;
    v_signals := v_signals || '{"action_intent": true}';
  END IF;
  
  -- Deepening question patterns
  IF v_lower_content ~ '(расскажи больше|как именно|а что если|можешь подробнее|хочу понять)' THEN
    v_deepening := TRUE;
    v_score := v_score + 0.2;
    v_confidence := v_confidence + 0.15;
    v_signals := v_signals || '{"deepening": true}';
  END IF;
  
  -- === NEGATIVE PATTERNS ===
  
  -- CRITICAL: Felt judged (worst case)
  IF v_lower_content ~ '(осуждаешь|обвиняешь|виню себя|стыдно|как будто я плохой|критикуешь|давишь)' THEN
    v_felt_judged := TRUE;
    v_score := -1.0;
    v_confidence := 0.9;
    v_signals := v_signals || '{"felt_judged": true}';
    v_label := 'felt_judged';
  END IF;
  
  -- Confusion patterns
  IF v_lower_content ~ '(не понял|не понимаю|что значит|что ты имеешь в виду|непонятно|как это)' THEN
    v_confusion := TRUE;
    v_score := v_score - 0.3;
    v_confidence := v_confidence + 0.25;
    v_signals := v_signals || '{"confusion": true}';
  END IF;
  
  -- Rejection patterns
  IF v_lower_content ~ '(не про меня|мимо|не то|не в тему|не помогает|бесполезно|ерунда)' THEN
    v_rejection := TRUE;
    v_score := v_score - 0.35;
    v_confidence := v_confidence + 0.3;
    v_signals := v_signals || '{"rejection": true}';
  END IF;
  
  -- Topic change patterns
  IF v_lower_content ~ '(кстати|а вот другое|сменим тему|забудь|не важно|ладно,? проехали)' THEN
    v_topic_change := TRUE;
    v_score := v_score - 0.15;
    v_confidence := v_confidence + 0.1;
    v_signals := v_signals || '{"topic_change": true}';
  END IF;
  
  -- === CONTEXTUAL SIGNALS ===
  
  -- Response time
  IF v_delay_sec > 86400 THEN  -- >24 hours
    v_score := v_score - 0.2;
    v_confidence := v_confidence + 0.05;
    v_signals := v_signals || '{"delayed_response": true}';
  ELSIF v_delay_sec < 30 THEN  -- <30 seconds - engaged
    v_score := v_score + 0.1;
    v_confidence := v_confidence + 0.05;
    v_signals := v_signals || '{"quick_response": true}';
  END IF;
  
  -- Message length
  IF v_msg_length > 150 THEN  -- Long detailed response
    v_score := v_score + 0.15;
    v_confidence := v_confidence + 0.1;
    v_signals := v_signals || '{"detailed_response": true}';
  ELSIF v_msg_length < 20 THEN  -- Short "ok" type
    v_score := v_score - 0.1;
    v_confidence := v_confidence + 0.05;
    v_signals := v_signals || '{"minimal_response": true}';
  END IF;
  
  -- === DETERMINE FINAL LABEL ===
  IF v_label IS NULL THEN
    IF v_score >= 0.3 THEN 
      v_label := 'helpful';
    ELSIF v_score <= -0.3 THEN 
      v_label := 'not_helpful';
    ELSE 
      v_label := 'neutral';
    END IF;
  END IF;
  
  -- Normalize confidence
  v_confidence := LEAST(v_confidence, 1.0);
  
  RETURN jsonb_build_object(
    'inferred_rating', v_label,
    'inferred_confidence', v_confidence,
    'raw_score', v_score,
    'signals', v_signals,
    'patterns', jsonb_build_object(
      'gratitude', v_gratitude,
      'validation', v_validation,
      'insight', v_insight,
      'confusion', v_confusion,
      'rejection', v_rejection,
      'felt_judged', v_felt_judged,
      'action_intent', v_action_intent,
      'deepening', v_deepening,
      'topic_change', v_topic_change
    ),
    'metrics', jsonb_build_object(
      'delay_sec', v_delay_sec,
      'message_length', v_msg_length
    )
  );
END;
$$;

-- ============================================================
-- TRIGGER: Auto-compute implicit feedback on new user message
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_previous_feedback()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev_assistant_msg RECORD;
  v_inference JSONB;
  v_patterns JSONB;
  v_metrics JSONB;
BEGIN
  -- Only process user messages
  IF NEW.role != 'user' THEN
    RETURN NEW;
  END IF;
  
  -- Find previous assistant message
  SELECT id, created_at INTO v_prev_assistant_msg
  FROM researcher_messages
  WHERE user_id = NEW.user_id 
    AND role = 'assistant'
    AND created_at < NEW.created_at
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_prev_assistant_msg.id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Compute implicit feedback
  v_inference := compute_implicit_feedback(
    v_prev_assistant_msg.id,
    NEW.id,
    NEW.content,
    NEW.created_at
  );
  
  -- Skip if error
  IF v_inference ? 'error' THEN
    RETURN NEW;
  END IF;
  
  v_patterns := v_inference->'patterns';
  v_metrics := v_inference->'metrics';
  
  -- Upsert feedback record
  INSERT INTO empathy_feedback (
    message_id, 
    user_id,
    next_user_message_id,
    inferred_rating,
    inferred_confidence,
    inferred_signals,
    next_message_delay_sec,
    next_message_length,
    contains_gratitude,
    contains_validation,
    contains_insight,
    contains_confusion,
    contains_rejection,
    contains_felt_judged,
    contains_action_intent,
    contains_deepening_question,
    contains_topic_change,
    final_label,
    label_source
  )
  VALUES (
    v_prev_assistant_msg.id,
    NEW.user_id,
    NEW.id,
    v_inference->>'inferred_rating',
    (v_inference->>'inferred_confidence')::DECIMAL,
    v_inference->'signals',
    (v_metrics->>'delay_sec')::INT,
    (v_metrics->>'message_length')::INT,
    COALESCE((v_patterns->>'gratitude')::BOOLEAN, FALSE),
    COALESCE((v_patterns->>'validation')::BOOLEAN, FALSE),
    COALESCE((v_patterns->>'insight')::BOOLEAN, FALSE),
    COALESCE((v_patterns->>'confusion')::BOOLEAN, FALSE),
    COALESCE((v_patterns->>'rejection')::BOOLEAN, FALSE),
    COALESCE((v_patterns->>'felt_judged')::BOOLEAN, FALSE),
    COALESCE((v_patterns->>'action_intent')::BOOLEAN, FALSE),
    COALESCE((v_patterns->>'deepening')::BOOLEAN, FALSE),
    COALESCE((v_patterns->>'topic_change')::BOOLEAN, FALSE),
    -- Final label: use inferred if confidence >= 0.5
    CASE 
      WHEN (v_inference->>'inferred_confidence')::DECIMAL >= 0.5 
      THEN v_inference->>'inferred_rating'
      ELSE 'unknown'
    END,
    'inferred'
  )
  ON CONFLICT (message_id, user_id) DO UPDATE SET
    next_user_message_id = EXCLUDED.next_user_message_id,
    inferred_rating = EXCLUDED.inferred_rating,
    inferred_confidence = EXCLUDED.inferred_confidence,
    inferred_signals = EXCLUDED.inferred_signals,
    next_message_delay_sec = EXCLUDED.next_message_delay_sec,
    next_message_length = EXCLUDED.next_message_length,
    contains_gratitude = EXCLUDED.contains_gratitude,
    contains_validation = EXCLUDED.contains_validation,
    contains_insight = EXCLUDED.contains_insight,
    contains_confusion = EXCLUDED.contains_confusion,
    contains_rejection = EXCLUDED.contains_rejection,
    contains_felt_judged = EXCLUDED.contains_felt_judged,
    contains_action_intent = EXCLUDED.contains_action_intent,
    contains_deepening_question = EXCLUDED.contains_deepening_question,
    contains_topic_change = EXCLUDED.contains_topic_change,
    -- Only update final_label if no explicit rating exists
    final_label = CASE 
      WHEN empathy_feedback.explicit_rating IS NOT NULL THEN empathy_feedback.final_label
      WHEN (v_inference->>'inferred_confidence')::DECIMAL >= 0.5 THEN v_inference->>'inferred_rating'
      ELSE 'unknown'
    END,
    label_source = CASE
      WHEN empathy_feedback.explicit_rating IS NOT NULL THEN 'explicit'
      ELSE 'inferred'
    END,
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_update_feedback_on_new_message ON researcher_messages;
CREATE TRIGGER trg_update_feedback_on_new_message
AFTER INSERT ON researcher_messages
FOR EACH ROW
EXECUTE FUNCTION update_previous_feedback();

-- ============================================================
-- VIEW: ML Export Dataset
-- ============================================================
CREATE OR REPLACE VIEW public.v_empathy_training_dataset AS
WITH conversation_context AS (
  SELECT 
    rm.id AS message_id,
    rm.user_id,
    rm.content AS assistant_response,
    rm.detected_emotion AS assistant_emotion,
    rm.created_at AS assistant_created_at,
    
    -- Previous user message (prompt)
    LAG(rm.content) OVER (
      PARTITION BY rm.user_id 
      ORDER BY rm.created_at
    ) AS user_prompt,
    
    LAG(rm.detected_emotion) OVER (
      PARTITION BY rm.user_id 
      ORDER BY rm.created_at
    ) AS user_emotion
    
  FROM researcher_messages rm
  WHERE rm.role = 'assistant'
)

SELECT 
  ef.id AS feedback_id,
  ef.message_id,
  ef.user_id,
  
  -- Training example format
  jsonb_build_object(
    'assistant_response', cc.assistant_response,
    'user_prompt', cc.user_prompt,
    'label', ef.final_label,
    'label_source', ef.label_source,
    'confidence', CASE 
      WHEN ef.label_source = 'explicit' THEN 1.0
      ELSE ef.inferred_confidence
    END,
    'negative_reason', COALESCE(
      ef.explicit_reason,
      CASE 
        WHEN ef.contains_felt_judged THEN 'felt_judged'
        WHEN ef.contains_confusion THEN 'not_understood'
        WHEN ef.contains_rejection THEN 'not_relevant'
        ELSE NULL
      END
    ),
    'user_emotion', cc.user_emotion,
    'signals', ef.inferred_signals
  ) AS training_example,
  
  -- Labels
  ef.final_label AS label,
  ef.label_source,
  ef.explicit_rating,
  ef.explicit_reason,
  ef.inferred_rating,
  ef.inferred_confidence,
  
  -- Behavior signals
  ef.inferred_signals,
  ef.next_message_delay_sec,
  ef.next_message_length,
  ef.contains_gratitude,
  ef.contains_felt_judged,
  ef.contains_confusion,
  ef.contains_rejection,
  ef.contains_action_intent,
  
  -- Context
  cc.user_prompt,
  cc.assistant_response,
  cc.user_emotion,
  
  ef.created_at

FROM empathy_feedback ef
JOIN conversation_context cc ON cc.message_id = ef.message_id
WHERE ef.final_label != 'unknown';