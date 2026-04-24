-- Add reply_to_id column for message replies
ALTER TABLE public.community_messages 
ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.community_messages(id) ON DELETE SET NULL;