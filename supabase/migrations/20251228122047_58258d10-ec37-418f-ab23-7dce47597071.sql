-- Create pinned_community_messages table
CREATE TABLE public.pinned_community_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.community_messages(id) ON DELETE CASCADE,
  pinned_by UUID NOT NULL,
  pinned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id)
);

-- Enable RLS
ALTER TABLE public.pinned_community_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can view pinned messages
CREATE POLICY "Anyone can view pinned community messages"
ON public.pinned_community_messages
FOR SELECT
USING (true);

-- Only admins can pin messages (using profiles.is_admin)
CREATE POLICY "Only admins can pin messages"
ON public.pinned_community_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Only admins can unpin messages
CREATE POLICY "Only admins can unpin messages"
ON public.pinned_community_messages
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Add realtime for pinned messages
ALTER TABLE public.pinned_community_messages REPLICA IDENTITY FULL;