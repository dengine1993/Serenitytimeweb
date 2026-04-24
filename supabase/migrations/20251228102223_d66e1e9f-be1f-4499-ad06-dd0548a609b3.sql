-- =============================================
-- COMMUNITY_RULES_ACCEPTED TABLE
-- =============================================
CREATE TABLE public.community_rules_accepted (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.community_rules_accepted ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own acceptance" ON public.community_rules_accepted FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own acceptance" ON public.community_rules_accepted FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- ADD MISSING COLUMN TO POSTS
-- =============================================
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS emotion TEXT;