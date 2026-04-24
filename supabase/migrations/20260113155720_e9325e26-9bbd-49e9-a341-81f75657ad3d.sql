-- Создать приватный bucket для PDF экспортов
INSERT INTO storage.buckets (id, name, public)
VALUES ('diary-exports', 'diary-exports', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: пользователь видит только свои файлы
CREATE POLICY "Users can access own exports"
ON storage.objects FOR SELECT
USING (bucket_id = 'diary-exports' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: пользователь может загружать в свою папку (для edge function с service role не нужно, но для полноты)
CREATE POLICY "Users can upload own exports"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'diary-exports' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: пользователь может обновлять свои файлы
CREATE POLICY "Users can update own exports"
ON storage.objects FOR UPDATE
USING (bucket_id = 'diary-exports' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Добавить колонки метаданных в profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_pdf_export_at timestamptz,
ADD COLUMN IF NOT EXISTS last_pdf_export_url text;