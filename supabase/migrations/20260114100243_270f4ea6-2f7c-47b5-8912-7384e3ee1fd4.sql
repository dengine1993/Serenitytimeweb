-- =====================================================
-- CLEANUP: Удаление старых объектов (feature включал art_therapy)
-- =====================================================

-- Удалить views
DROP VIEW IF EXISTS public.v_trial_analytics CASCADE;
DROP VIEW IF EXISTS public.v_finetune_message_pairs CASCADE;
DROP VIEW IF EXISTS public.v_finetune_conversations CASCADE;

-- Удалить таблицы (каскадно удалит индексы и policies)
DROP TABLE IF EXISTS public.training_examples CASCADE;
DROP TABLE IF EXISTS public.trial_events CASCADE;
DROP TABLE IF EXISTS public.trial_messages CASCADE;
DROP TABLE IF EXISTS public.trial_sessions CASCADE;

-- =====================================================
-- ML Dataset: Trial Sessions для AI-психолога (Researcher ONLY)
-- Цель: Сбор данных для fine-tuning LLM конверсии
-- =====================================================

-- Таблица 1: Сессии триала AI-психолога
CREATE TABLE public.trial_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Таймлайн сессии
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  
  -- CTA трекинг
  cta_shown_at TIMESTAMPTZ,
  cta_clicked_at TIMESTAMPTZ,
  cta_dismissed_at TIMESTAMPTZ,
  
  -- Результат конверсии
  purchased_at TIMESTAMPTZ,
  plan_purchased TEXT CHECK (plan_purchased IN ('monthly', 'yearly')),
  purchase_amount_rub INT,
  
  -- Счётчик сообщений
  messages_count INT DEFAULT 0,
  
  -- A/B тестирование промптов
  prompt_variant TEXT,
  system_prompt_hash TEXT,
  
  -- Агрегированные метрики (заполняются функцией)
  avg_user_msg_length INT,
  avg_assistant_msg_length INT,
  avg_response_time_sec INT,
  session_duration_sec INT,
  
  -- Эмоциональный профиль
  dominant_emotion TEXT,
  emotion_trajectory TEXT CHECK (emotion_trajectory IN ('improving', 'stable', 'worsening')),
  crisis_detected BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Таблица 2: Сообщения триала с NLP-метриками
CREATE TABLE public.trial_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES trial_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Контент
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  message_number INT NOT NULL,
  
  -- Временные метрики
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  response_time_ms INT,
  
  -- NLP-фичи для ML
  detected_emotion TEXT,
  emotion_intensity DECIMAL(3,2),
  sentiment_score DECIMAL(3,2),
  
  -- Темы и интенты
  detected_topics TEXT[],
  user_intent TEXT,
  
  -- Качество ответа AI
  contains_cta_hint BOOLEAN,
  cta_softness_score DECIMAL(3,2),
  empathy_score DECIMAL(3,2),
  
  -- Токены
  token_count INT,
  
  -- Маркировка для обучения
  is_conversion_trigger BOOLEAN,
  training_label TEXT CHECK (training_label IN ('positive', 'negative', 'neutral'))
);

-- Таблица 3: События CTA
CREATE TABLE public.trial_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES trial_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  event_type TEXT NOT NULL CHECK (event_type IN (
    'cta_shown', 'cta_clicked', 'cta_dismissed',
    'checkout_started', 'purchase_completed', 'purchase_cancelled'
  )),
  
  source TEXT NOT NULL CHECK (source IN (
    'researcher_exhausted_card', 'premium_page', 'other'
  )),
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Таблица 4: Готовые примеры для fine-tuning
CREATE TABLE public.training_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES trial_sessions(id) ON DELETE CASCADE,
  
  -- Формат для fine-tuning (OpenAI/Anthropic)
  messages JSONB NOT NULL,
  
  -- Метки
  label TEXT NOT NULL CHECK (label IN (
    'converted_monthly',
    'converted_yearly',
    'converted_later',
    'not_converted',
    'churned'
  )),
  
  -- A/B вариант
  prompt_variant TEXT,
  
  -- Качество конверсии
  conversion_quality_score DECIMAL(3,2),
  
  -- Временные метки
  session_started_at TIMESTAMPTZ,
  session_ended_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  time_to_conversion_sec INT,
  
  -- Валидация
  is_validated BOOLEAN DEFAULT false,
  validator_notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- Индексы
-- =====================================================

CREATE INDEX idx_trial_sessions_user ON trial_sessions(user_id);
CREATE INDEX idx_trial_sessions_purchased ON trial_sessions(purchased_at) WHERE purchased_at IS NOT NULL;
CREATE INDEX idx_trial_sessions_prompt_variant ON trial_sessions(prompt_variant);

CREATE INDEX idx_trial_messages_session ON trial_messages(session_id);
CREATE INDEX idx_trial_messages_role ON trial_messages(session_id, role);

CREATE INDEX idx_trial_events_session ON trial_events(session_id);
CREATE INDEX idx_trial_events_type ON trial_events(event_type);

CREATE INDEX idx_training_examples_label ON training_examples(label);
CREATE INDEX idx_training_examples_session ON training_examples(session_id);

-- =====================================================
-- Views для экспорта
-- =====================================================

-- View 1: Полные диалоги для JSONL экспорта
CREATE OR REPLACE VIEW public.v_finetune_conversations AS
SELECT 
  te.id,
  te.session_id,
  te.label,
  te.prompt_variant,
  te.messages,
  
  jsonb_build_object(
    'user_registered_days_ago', EXTRACT(DAY FROM (ts.started_at - p.created_at)),
    'session_duration_sec', ts.session_duration_sec,
    'messages_count', ts.messages_count,
    'dominant_emotion', ts.dominant_emotion,
    'emotion_trajectory', ts.emotion_trajectory,
    'crisis_detected', ts.crisis_detected
  ) AS user_context,
  
  te.time_to_conversion_sec,
  te.conversion_quality_score,
  
  CASE 
    WHEN te.label LIKE 'converted%' THEN 1 
    ELSE 0 
  END AS is_positive_example

FROM training_examples te
JOIN trial_sessions ts ON ts.id = te.session_id
JOIN profiles p ON p.user_id = ts.user_id;

-- View 2: Пары user→assistant для RLHF
CREATE OR REPLACE VIEW public.v_finetune_message_pairs AS
SELECT 
  tm_user.session_id,
  tm_user.message_number,
  
  (
    SELECT jsonb_agg(
      jsonb_build_object('role', role, 'content', content)
      ORDER BY message_number
    )
    FROM trial_messages prev
    WHERE prev.session_id = tm_user.session_id 
      AND prev.message_number < tm_user.message_number
  ) AS context,
  
  tm_user.content AS user_message,
  tm_user.detected_emotion AS user_emotion,
  tm_user.user_intent,
  
  tm_asst.content AS assistant_response,
  tm_asst.empathy_score,
  tm_asst.cta_softness_score,
  tm_asst.contains_cta_hint,
  
  CASE 
    WHEN ts.purchased_at IS NOT NULL 
         AND tm_asst.message_number = ts.messages_count 
    THEN 'conversion_trigger'
    WHEN ts.purchased_at IS NOT NULL THEN 'positive_path'
    ELSE 'negative_path'
  END AS pair_label,
  
  ts.plan_purchased

FROM trial_messages tm_user
JOIN trial_messages tm_asst 
  ON tm_asst.session_id = tm_user.session_id 
  AND tm_asst.message_number = tm_user.message_number + 1
  AND tm_asst.role = 'assistant'
JOIN trial_sessions ts ON ts.id = tm_user.session_id
WHERE tm_user.role = 'user';

-- View 3: Аналитика по вариантам промптов
CREATE OR REPLACE VIEW public.v_trial_analytics AS
SELECT 
  prompt_variant,
  COUNT(*) AS total_sessions,
  COUNT(*) FILTER (WHERE purchased_at IS NOT NULL) AS conversions,
  ROUND(
    COUNT(*) FILTER (WHERE purchased_at IS NOT NULL)::DECIMAL / 
    NULLIF(COUNT(*), 0) * 100, 2
  ) AS conversion_rate,
  AVG(messages_count) AS avg_messages,
  AVG(session_duration_sec) AS avg_duration_sec,
  COUNT(*) FILTER (WHERE plan_purchased = 'yearly') AS yearly_conversions,
  SUM(purchase_amount_rub) AS total_revenue_rub
FROM trial_sessions
GROUP BY prompt_variant;

-- =====================================================
-- RLS Policies
-- =====================================================

ALTER TABLE trial_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_examples ENABLE ROW LEVEL SECURITY;

-- Юзеры видят только свои сессии
CREATE POLICY "Users view own sessions" ON trial_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users view own messages" ON trial_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users view own events" ON trial_events
  FOR SELECT USING (auth.uid() = user_id);

-- Админы видят training examples
CREATE POLICY "Admins view training examples" ON training_examples
  FOR SELECT USING (is_admin());

-- Service role полный доступ (для edge functions)
CREATE POLICY "Service role full access sessions" ON trial_sessions
  FOR ALL USING (true) WITH CHECK (true);
  
CREATE POLICY "Service role full access messages" ON trial_messages
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access events" ON trial_events
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access examples" ON training_examples
  FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE trial_sessions IS 'ML Dataset: Сессии AI-психолога для fine-tuning конверсии';
COMMENT ON TABLE trial_messages IS 'ML Dataset: Сообщения с NLP-метриками для анализа';
COMMENT ON TABLE trial_events IS 'ML Dataset: CTA события для воронки конверсии';
COMMENT ON TABLE training_examples IS 'ML Dataset: Готовые примеры в формате JSONL для LLM fine-tuning';
COMMENT ON VIEW v_finetune_conversations IS 'Экспорт полных диалогов для fine-tuning';
COMMENT ON VIEW v_finetune_message_pairs IS 'Пары user→assistant для RLHF';
COMMENT ON VIEW v_trial_analytics IS 'Аналитика A/B тестов промптов';