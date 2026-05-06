-- Пересоздаём FK с CASCADE (idempotent)
ALTER TABLE public.story_comments DROP CONSTRAINT IF EXISTS story_comments_story_id_fkey;
ALTER TABLE public.story_comments
  ADD CONSTRAINT story_comments_story_id_fkey
  FOREIGN KEY (story_id) REFERENCES public.user_stories(id) ON DELETE CASCADE;

ALTER TABLE public.story_reactions DROP CONSTRAINT IF EXISTS story_reactions_story_id_fkey;
ALTER TABLE public.story_reactions
  ADD CONSTRAINT story_reactions_story_id_fkey
  FOREIGN KEY (story_id) REFERENCES public.user_stories(id) ON DELETE CASCADE;

ALTER TABLE public.story_comment_reactions DROP CONSTRAINT IF EXISTS story_comment_reactions_comment_id_fkey;
ALTER TABLE public.story_comment_reactions
  ADD CONSTRAINT story_comment_reactions_comment_id_fkey
  FOREIGN KEY (comment_id) REFERENCES public.story_comments(id) ON DELETE CASCADE;

-- Серверный RPC
CREATE OR REPLACE FUNCTION public.create_user_story(
  p_content text,
  p_title text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_last_at timestamptz;
  v_clean_content text;
  v_clean_title text;
  v_story_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_clean_content := TRIM(COALESCE(p_content, ''));
  v_clean_title   := NULLIF(TRIM(COALESCE(p_title, '')), '');

  IF char_length(v_clean_content) < 30 THEN
    RAISE EXCEPTION 'Story too short (min 30 characters)';
  END IF;

  IF char_length(v_clean_content) > 10000 THEN
    RAISE EXCEPTION 'Story too long (max 10000 characters)';
  END IF;

  IF v_clean_title IS NOT NULL AND char_length(v_clean_title) > 100 THEN
    RAISE EXCEPTION 'Title too long (max 100 characters)';
  END IF;

  SELECT created_at INTO v_last_at
  FROM public.user_stories
  WHERE user_id = v_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_last_at IS NOT NULL AND v_last_at > NOW() - INTERVAL '24 hours' THEN
    RAISE EXCEPTION 'Rate limit: only one story per 24 hours';
  END IF;

  INSERT INTO public.user_stories (user_id, title, content)
  VALUES (v_user_id, v_clean_title, v_clean_content)
  RETURNING id INTO v_story_id;

  RETURN v_story_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_user_story(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.create_user_story(text, text) TO authenticated;