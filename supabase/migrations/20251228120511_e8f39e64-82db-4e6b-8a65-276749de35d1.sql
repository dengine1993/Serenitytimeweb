-- Create storage bucket for community attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('community-attachments', 'community-attachments', true);

-- Storage policies for community attachments
CREATE POLICY "Anyone can view community attachments" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'community-attachments');

CREATE POLICY "Authenticated users can upload community attachments" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'community-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own community attachments" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'community-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add media columns to community_messages
ALTER TABLE public.community_messages 
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS media_type TEXT;