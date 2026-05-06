-- M1: индексы для оптимизации get_feed_with_meta и подсчёта реакций
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_type
  ON public.post_reactions (post_id, reaction_type);

-- Частичный индекс для быстрого подсчёта support-реакций
CREATE INDEX IF NOT EXISTS idx_post_reactions_support
  ON public.post_reactions (post_id)
  WHERE reaction_type = 'support';