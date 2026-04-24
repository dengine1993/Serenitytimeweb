-- Включаем расширение pgvector для семантического поиска
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Добавляем колонку embedding (3072 измерений, как у text-embedding-3-large) в jiva_memory_chunks
ALTER TABLE public.jiva_memory_chunks
  ADD COLUMN IF NOT EXISTS embedding extensions.vector(3072);

-- Индекс для cosine-похожести (HNSW поддерживает <=2000 dim, для 3072 используем ivfflat)
-- Поскольку pgvector ivfflat ограничен 2000 dim, используем простой btree по user_id + сортировку в RPC
CREATE INDEX IF NOT EXISTS idx_jiva_memory_chunks_user_id
  ON public.jiva_memory_chunks (user_id, created_at DESC);

-- Таблица кэша эмбеддингов (по hash текста)
CREATE TABLE IF NOT EXISTS public.jiva_embed_cache (
  hash text PRIMARY KEY,
  embedding extensions.vector(3072) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.jiva_embed_cache ENABLE ROW LEVEL SECURITY;

-- Кэш доступен только service_role (никто из клиентов не должен читать/писать)
-- RLS включен, политик нет → клиенты ничего не могут

-- Таблица учёта расхода эмбеддингов
CREATE TABLE IF NOT EXISTS public.jiva_embed_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'polza',
  model text NOT NULL,
  items integer NOT NULL DEFAULT 0,
  prompt_tokens integer NOT NULL DEFAULT 0,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.jiva_embed_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view embed usage"
  ON public.jiva_embed_usage FOR SELECT
  USING (is_admin());

-- RPC: поиск top-K по cosine similarity для пользователя
CREATE OR REPLACE FUNCTION public.search_jiva_memories(
  query_user_id uuid,
  query_embedding extensions.vector(3072),
  match_count integer DEFAULT 8
)
RETURNS TABLE (
  id uuid,
  content text,
  source_type text,
  metadata jsonb,
  created_at timestamptz,
  score float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    m.id,
    m.content,
    m.source_type,
    m.metadata,
    m.created_at,
    1 - (m.embedding <=> query_embedding) AS score
  FROM public.jiva_memory_chunks m
  WHERE m.user_id = query_user_id
    AND m.embedding IS NOT NULL
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
$$;

REVOKE ALL ON FUNCTION public.search_jiva_memories(uuid, extensions.vector, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.search_jiva_memories(uuid, extensions.vector, integer) TO authenticated, service_role;