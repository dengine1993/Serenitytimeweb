-- C4: Закрыть LIST на публичных бакетах.
-- Public CDN (/storage/v1/object/public/...) не использует RLS, поэтому
-- удаление этих политик не ломает <img src> и <audio src>.
-- Service role bypass RLS, так что edge-функции (delete-user-data) продолжают работать.

DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
DROP POLICY IF EXISTS "community_attachments_public_read" ON storage.objects;
DROP POLICY IF EXISTS "audio_cache_public_read" ON storage.objects;
DROP POLICY IF EXISTS "email_assets_public_read" ON storage.objects;
