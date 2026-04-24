-- =============================================
-- ТАБЛИЦА user_trials: 24-часовой триал для новых пользователей
-- =============================================
CREATE TABLE public.user_trials (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  messages_used INT NOT NULL DEFAULT 0,
  art_used INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Комментарий к таблице
COMMENT ON TABLE public.user_trials IS 'Хранит информацию о 24-часовых триалах пользователей';
COMMENT ON COLUMN public.user_trials.messages_used IS 'Количество использованных сообщений AI-психолога (макс 3)';
COMMENT ON COLUMN public.user_trials.art_used IS 'Количество использованных анализов рисунков (макс 1)';

-- RLS для user_trials
ALTER TABLE public.user_trials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trial" ON public.user_trials
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trial" ON public.user_trials
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trial" ON public.user_trials
  FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- ТАБЛИЦА emergency_buffer_usage: экстренный буфер для Premium
-- =============================================
CREATE TABLE public.emergency_buffer_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at DATE NOT NULL DEFAULT CURRENT_DATE,
  messages_used INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, used_at)
);

-- Комментарий к таблице
COMMENT ON TABLE public.emergency_buffer_usage IS 'Отслеживает использование экстренного буфера (+5 сообщений) для Premium пользователей';
COMMENT ON COLUMN public.emergency_buffer_usage.used_at IS 'Дата использования буфера';
COMMENT ON COLUMN public.emergency_buffer_usage.messages_used IS 'Количество использованных сообщений из буфера (макс 5)';

-- Индекс для быстрого подсчёта использований в месяце
CREATE INDEX idx_emergency_buffer_month ON public.emergency_buffer_usage(user_id, used_at);

-- RLS для emergency_buffer_usage
ALTER TABLE public.emergency_buffer_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own buffer" ON public.emergency_buffer_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own buffer" ON public.emergency_buffer_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own buffer" ON public.emergency_buffer_usage
  FOR UPDATE USING (auth.uid() = user_id);