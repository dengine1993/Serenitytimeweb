-- Таблица микро-действий, предложенных Jiva и выполненных пользователем
CREATE TABLE public.user_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 280),
  context TEXT,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('jiva_deep', 'jiva_fast', 'manual')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'skipped')),
  done_at TIMESTAMPTZ,
  reflection TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own actions"
  ON public.user_actions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own actions"
  ON public.user_actions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own actions"
  ON public.user_actions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own actions"
  ON public.user_actions FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_user_actions_user_status ON public.user_actions(user_id, status, created_at DESC);
CREATE INDEX idx_user_actions_user_done ON public.user_actions(user_id, done_at DESC) WHERE status = 'done';

CREATE TRIGGER trg_user_actions_updated_at
  BEFORE UPDATE ON public.user_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();