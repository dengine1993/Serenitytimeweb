-- 1. Add edited_at columns
ALTER TABLE public.post_comments    ADD COLUMN IF NOT EXISTS edited_at timestamptz;
ALTER TABLE public.story_comments   ADD COLUMN IF NOT EXISTS edited_at timestamptz;
ALTER TABLE public.private_messages ADD COLUMN IF NOT EXISTS edited_at timestamptz;

-- 2. RLS UPDATE policies
DROP POLICY IF EXISTS "Users can update their own post_comments" ON public.post_comments;
CREATE POLICY "Users can update their own post_comments"
ON public.post_comments FOR UPDATE
USING (auth.uid() = user_id AND is_jiva = false)
WITH CHECK (auth.uid() = user_id AND is_jiva = false);

DROP POLICY IF EXISTS "Users can update their own story_comments" ON public.story_comments;
CREATE POLICY "Users can update their own story_comments"
ON public.story_comments FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Senders can edit their private messages" ON public.private_messages;
CREATE POLICY "Senders can edit their private messages"
ON public.private_messages FOR UPDATE
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

-- 3. Triggers to stamp edited_at automatically when content changes
CREATE OR REPLACE FUNCTION public.set_edited_at_on_content_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.content IS DISTINCT FROM OLD.content THEN
    NEW.edited_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_comments_edited_at ON public.post_comments;
CREATE TRIGGER trg_post_comments_edited_at
BEFORE UPDATE ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.set_edited_at_on_content_change();

DROP TRIGGER IF EXISTS trg_story_comments_edited_at ON public.story_comments;
CREATE TRIGGER trg_story_comments_edited_at
BEFORE UPDATE ON public.story_comments
FOR EACH ROW EXECUTE FUNCTION public.set_edited_at_on_content_change();

DROP TRIGGER IF EXISTS trg_private_messages_edited_at ON public.private_messages;
CREATE TRIGGER trg_private_messages_edited_at
BEFORE UPDATE ON public.private_messages
FOR EACH ROW EXECUTE FUNCTION public.set_edited_at_on_content_change();