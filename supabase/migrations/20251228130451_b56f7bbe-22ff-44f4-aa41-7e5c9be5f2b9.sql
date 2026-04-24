-- Create storage bucket for cached audio
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-cache', 'audio-cache', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public read access for audio cache"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio-cache');

-- Allow edge functions to upload (service role)
CREATE POLICY "Service role can upload to audio cache"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'audio-cache');