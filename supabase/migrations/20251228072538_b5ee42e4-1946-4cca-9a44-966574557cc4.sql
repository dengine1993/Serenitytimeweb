-- Create community messages table for real-time user-to-user chat
CREATE TABLE public.community_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  content TEXT NOT NULL CHECK (length(content) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  reported_count INT NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can read non-hidden messages
CREATE POLICY "Anyone can read community messages"
ON public.community_messages
FOR SELECT
USING (is_hidden = false);

-- Users can insert their own messages
CREATE POLICY "Users can insert own messages"
ON public.community_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create table to track users who accepted community rules
CREATE TABLE public.community_rules_accepted (
  user_id UUID PRIMARY KEY,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.community_rules_accepted ENABLE ROW LEVEL SECURITY;

-- Users can view their own acceptance
CREATE POLICY "Users can view own rules acceptance"
ON public.community_rules_accepted
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own acceptance
CREATE POLICY "Users can insert own rules acceptance"
ON public.community_rules_accepted
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Enable realtime for community messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;

-- Create index for faster queries
CREATE INDEX idx_community_messages_created_at ON public.community_messages(created_at DESC);
CREATE INDEX idx_community_messages_user_id ON public.community_messages(user_id);