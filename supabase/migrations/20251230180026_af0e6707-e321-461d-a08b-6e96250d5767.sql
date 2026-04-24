-- Enable realtime for community_messages table
ALTER TABLE public.community_messages REPLICA IDENTITY FULL;

-- Add to realtime publication (drop first if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE tablename = 'community_messages' AND pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.community_messages;
  END IF;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;
END $$;