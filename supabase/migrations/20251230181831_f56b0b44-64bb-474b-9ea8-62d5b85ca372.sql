-- Create table for message read receipts
CREATE TABLE public.message_read_receipts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES public.community_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Enable RLS
ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;

-- Anyone can view read receipts (needed to show read status)
CREATE POLICY "Anyone can view read receipts"
ON public.message_read_receipts
FOR SELECT
USING (true);

-- Users can mark messages as read
CREATE POLICY "Users can create read receipts"
ON public.message_read_receipts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_message_read_receipts_message_id ON public.message_read_receipts(message_id);
CREATE INDEX idx_message_read_receipts_user_id ON public.message_read_receipts(user_id);

-- Enable realtime for read receipts
ALTER TABLE public.message_read_receipts REPLICA IDENTITY FULL;

-- Add to realtime publication if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'message_read_receipts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_read_receipts;
  END IF;
END $$;