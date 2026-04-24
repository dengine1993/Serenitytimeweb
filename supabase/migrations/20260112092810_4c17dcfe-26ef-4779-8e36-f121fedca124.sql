-- Create user_stories table
CREATE TABLE public.user_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL CHECK (char_length(content) >= 100),
  is_anonymous BOOLEAN DEFAULT false,
  is_hidden BOOLEAN DEFAULT false,
  comment_count INTEGER DEFAULT 0,
  last_comment_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create story_comments table
CREATE TABLE public.story_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.user_stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  reply_to_id UUID REFERENCES public.story_comments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_stories
CREATE POLICY "Anyone can view non-hidden stories"
ON public.user_stories FOR SELECT
USING (is_hidden = false OR user_id = auth.uid() OR is_moderator_or_admin());

CREATE POLICY "Authenticated users can create stories"
ON public.user_stories FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stories"
ON public.user_stories FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories or moderators"
ON public.user_stories FOR DELETE
USING (auth.uid() = user_id OR is_moderator_or_admin());

-- RLS policies for story_comments
CREATE POLICY "Anyone can view comments on visible stories"
ON public.story_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_stories s 
    WHERE s.id = story_id 
    AND (s.is_hidden = false OR s.user_id = auth.uid() OR is_moderator_or_admin())
  )
);

CREATE POLICY "Authenticated users can create comments"
ON public.story_comments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments or moderators"
ON public.story_comments FOR DELETE
USING (auth.uid() = user_id OR is_moderator_or_admin());

-- Trigger function to update comment count and last_comment_at
CREATE OR REPLACE FUNCTION public.update_story_comment_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.user_stories 
    SET comment_count = comment_count + 1,
        last_comment_at = NEW.created_at,
        updated_at = now()
    WHERE id = NEW.story_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.user_stories 
    SET comment_count = GREATEST(0, comment_count - 1),
        updated_at = now()
    WHERE id = OLD.story_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create triggers
CREATE TRIGGER on_story_comment_insert
AFTER INSERT ON public.story_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_story_comment_stats();

CREATE TRIGGER on_story_comment_delete
AFTER DELETE ON public.story_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_story_comment_stats();

-- Indexes for performance
CREATE INDEX idx_user_stories_user_id ON public.user_stories(user_id);
CREATE INDEX idx_user_stories_created_at ON public.user_stories(created_at DESC);
CREATE INDEX idx_user_stories_last_comment ON public.user_stories(last_comment_at DESC NULLS LAST);
CREATE INDEX idx_story_comments_story_id ON public.story_comments(story_id);
CREATE INDEX idx_story_comments_created_at ON public.story_comments(created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_stories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.story_comments;