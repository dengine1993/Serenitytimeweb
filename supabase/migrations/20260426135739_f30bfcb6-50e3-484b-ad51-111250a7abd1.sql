-- ============================================================
-- PHASE 1: Performance — HNSW (halfvec) + composite index
-- ============================================================

-- Composite index for user filtering + time ordering (pre-filter for HNSW)
CREATE INDEX IF NOT EXISTS jiva_memory_chunks_user_created_idx
  ON public.jiva_memory_chunks (user_id, created_at DESC);

-- HNSW on halfvec(3072) — pgvector 0.7+ allows up to 4000 dims for halfvec.
-- Falls back gracefully: if extension or dim limit fails, we still have the composite index.
DO $$
BEGIN
  BEGIN
    EXECUTE $sql$
      CREATE INDEX IF NOT EXISTS jiva_memory_chunks_embedding_hnsw
        ON public.jiva_memory_chunks
        USING hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    $sql$;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'HNSW halfvec index skipped: %', SQLERRM;
  END;
END $$;

-- ============================================================
-- PHASE 1: Updated search function with time-decay
-- ============================================================
CREATE OR REPLACE FUNCTION public.search_jiva_memories(
  query_user_id uuid,
  query_embedding extensions.vector,
  match_count integer DEFAULT 8
)
RETURNS TABLE (
  id uuid,
  content text,
  source_type text,
  metadata jsonb,
  created_at timestamptz,
  score double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
  -- Hybrid score: cosine similarity * exp(-age_days / 180)
  -- Recent memories rank higher than equally-similar old ones.
  SELECT
    m.id,
    m.content,
    m.source_type,
    m.metadata,
    m.created_at,
    (1 - (m.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)))
      * exp(- EXTRACT(EPOCH FROM (now() - m.created_at)) / (86400.0 * 180.0))
      AS score
  FROM public.jiva_memory_chunks m
  WHERE m.user_id = query_user_id
    AND m.embedding IS NOT NULL
  ORDER BY m.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)
  LIMIT match_count;
$$;

-- ============================================================
-- PHASE 4: chat summary fields
-- ============================================================
ALTER TABLE public.ai_chats
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS summary_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS summary_message_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS ai_messages_chat_created_idx
  ON public.ai_messages (chat_id, created_at);

-- ============================================================
-- PHASE 3: ingest queue for diary -> embeddings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.jiva_ingest_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_type text NOT NULL,        -- 'diary' | 'smer' | 'crisis'
  source_id uuid,                   -- id of source row (if any)
  content text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | processing | done | error
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS jiva_ingest_queue_status_idx
  ON public.jiva_ingest_queue (status, created_at)
  WHERE status = 'pending';

ALTER TABLE public.jiva_ingest_queue ENABLE ROW LEVEL SECURITY;

-- No client-side policies: only edge functions (service role) touch this table.
-- Owners can SELECT for transparency/debug.
DROP POLICY IF EXISTS "Users can view their own ingest queue" ON public.jiva_ingest_queue;
CREATE POLICY "Users can view their own ingest queue"
  ON public.jiva_ingest_queue FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- PHASE 3: Triggers — enqueue diary/smer entries
-- ============================================================
CREATE OR REPLACE FUNCTION public.enqueue_mood_entry_for_jiva()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_text text;
BEGIN
  -- Only meaningful notes
  IF NEW.note IS NULL OR length(trim(NEW.note)) < 50 THEN
    RETURN NEW;
  END IF;

  v_text := format(
    'Дневник настроения %s: настроение %s (%s/10)%s. Заметка: %s',
    NEW.entry_date,
    COALESCE(NEW.mood, '—'),
    COALESCE(NEW.mood_score::text, '—'),
    CASE WHEN NEW.emotions IS NOT NULL AND array_length(NEW.emotions, 1) > 0
         THEN ', эмоции: ' || array_to_string(NEW.emotions, ', ')
         ELSE '' END,
    NEW.note
  );

  INSERT INTO public.jiva_ingest_queue (user_id, source_type, source_id, content)
  VALUES (NEW.user_id, 'diary', NEW.id, v_text);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the original insert
  RAISE NOTICE 'enqueue_mood_entry_for_jiva failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mood_enqueue_jiva ON public.mood_entries;
CREATE TRIGGER trg_mood_enqueue_jiva
  AFTER INSERT ON public.mood_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_mood_entry_for_jiva();

-- SMER trigger (only if smer_entries exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='smer_entries') THEN
    EXECUTE $sql$
      CREATE OR REPLACE FUNCTION public.enqueue_smer_entry_for_jiva()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path TO 'public'
      AS $f$
      DECLARE
        v_text text;
      BEGIN
        v_text := format(
          'СМЭР %s. Ситуация: %s. Мысли: %s. Эмоции: %s. Реакции: %s',
          NEW.entry_date,
          COALESCE(NEW.situation, '—'),
          COALESCE(NEW.thoughts, '—'),
          COALESCE(NEW.emotions::text, '—'),
          COALESCE(NEW.reactions::text, '—')
        );
        IF length(trim(v_text)) < 80 THEN
          RETURN NEW;
        END IF;
        INSERT INTO public.jiva_ingest_queue (user_id, source_type, source_id, content)
        VALUES (NEW.user_id, 'smer', NEW.id, v_text);
        RETURN NEW;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'enqueue_smer_entry_for_jiva failed: %', SQLERRM;
        RETURN NEW;
      END;
      $f$;
    $sql$;

    EXECUTE 'DROP TRIGGER IF EXISTS trg_smer_enqueue_jiva ON public.smer_entries';
    EXECUTE 'CREATE TRIGGER trg_smer_enqueue_jiva AFTER INSERT ON public.smer_entries FOR EACH ROW EXECUTE FUNCTION public.enqueue_smer_entry_for_jiva()';
  END IF;
END $$;