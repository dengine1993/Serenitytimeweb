-- Reactions for stories
CREATE TABLE public.story_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.user_stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('heart', 'hug', 'strength')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(story_id, user_id, reaction_type)
);

-- Reactions for story comments
CREATE TABLE public.story_comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.story_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('heart', 'hug', 'strength')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id, reaction_type)
);

-- Enable RLS
ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_comment_reactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for story_reactions
CREATE POLICY "Anyone can view story reactions"
ON public.story_reactions FOR SELECT
USING (true);

CREATE POLICY "Users can add their own story reactions"
ON public.story_reactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own story reactions"
ON public.story_reactions FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for story_comment_reactions
CREATE POLICY "Anyone can view comment reactions"
ON public.story_comment_reactions FOR SELECT
USING (true);

CREATE POLICY "Users can add their own comment reactions"
ON public.story_comment_reactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own comment reactions"
ON public.story_comment_reactions FOR DELETE
USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_story_reactions_story_id ON public.story_reactions(story_id);
CREATE INDEX idx_story_comment_reactions_comment_id ON public.story_comment_reactions(comment_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.story_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.story_comment_reactions;