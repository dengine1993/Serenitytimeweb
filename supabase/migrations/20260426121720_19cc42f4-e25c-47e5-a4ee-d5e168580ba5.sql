-- Indices for feed performance
CREATE INDEX IF NOT EXISTS idx_posts_created_at_approved
  ON public.posts (created_at DESC)
  WHERE moderation_status = 'approved';

CREATE INDEX IF NOT EXISTS idx_posts_moderation_status
  ON public.posts (moderation_status);

CREATE INDEX IF NOT EXISTS idx_post_comments_post_id
  ON public.post_comments (post_id, created_at);

CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id
  ON public.post_reactions (post_id);

-- Protect is_jiva flag and Jiva bot identity from spoofing
CREATE OR REPLACE FUNCTION public.protect_jiva_comment_flag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jiva_bot_id uuid := '00000000-0000-0000-0000-000000000001';
  v_caller uuid := auth.uid();
BEGIN
  -- If session is service_role (edge function), allow everything
  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Block users from setting is_jiva = true
  IF NEW.is_jiva = true THEN
    RAISE EXCEPTION 'Only system can post Jiva comments';
  END IF;

  -- Block users from posting as the Jiva bot user_id
  IF NEW.user_id = v_jiva_bot_id THEN
    RAISE EXCEPTION 'Cannot post as Jiva bot';
  END IF;

  -- On UPDATE: protect against flipping is_jiva from false to true
  IF TG_OP = 'UPDATE' THEN
    IF OLD.is_jiva IS DISTINCT FROM NEW.is_jiva THEN
      RAISE EXCEPTION 'Cannot modify is_jiva flag';
    END IF;
    IF OLD.user_id IS DISTINCT FROM NEW.user_id THEN
      RAISE EXCEPTION 'Cannot reassign comment owner';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_jiva_flag ON public.post_comments;
CREATE TRIGGER trg_protect_jiva_flag
  BEFORE INSERT OR UPDATE ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_jiva_comment_flag();