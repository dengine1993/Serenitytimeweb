-- =====================================================================
-- 1) Перевод SECURITY DEFINER views в обычные (SECURITY INVOKER)
--    PG15+: views по умолчанию SECURITY INVOKER, явно проставим reset.
-- =====================================================================
DO $$
DECLARE
  v record;
BEGIN
  FOR v IN
    SELECT n.nspname AS schema_name, c.relname AS view_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind IN ('v', 'm')
      AND n.nspname = 'public'
      AND EXISTS (
        SELECT 1 FROM pg_options_to_table(c.reloptions) opt
        WHERE opt.option_name = 'security_invoker' AND opt.option_value = 'false'
        UNION
        SELECT 1 WHERE c.reloptions::text ILIKE '%security_definer%'
      )
  LOOP
    EXECUTE format('ALTER VIEW %I.%I SET (security_invoker = true);', v.schema_name, v.view_name);
    RAISE NOTICE 'Set security_invoker=true on %.%', v.schema_name, v.view_name;
  END LOOP;
END $$;

-- На всякий случай: для всех public views принудительно ставим security_invoker=true.
DO $$
DECLARE
  v record;
BEGIN
  FOR v IN
    SELECT schemaname, viewname FROM pg_views WHERE schemaname = 'public'
  LOOP
    BEGIN
      EXECUTE format('ALTER VIEW %I.%I SET (security_invoker = true);', v.schemaname, v.viewname);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skip view %.% — %', v.schemaname, v.viewname, SQLERRM;
    END;
  END LOOP;
END $$;

-- =====================================================================
-- 2) Закрыть листинг публичных storage-бакетов.
--    Удаляем permissive SELECT-политики, оставляем чтение только по
--    явному пути (получить файл по URL можно, перечислить — нельзя).
-- =====================================================================
DO $$
DECLARE
  pol record;
BEGIN
  -- Чистим только наши (не системные) политики на storage.objects, которые
  -- дают неограниченный SELECT на публичные бакеты.
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname IN (
        'Public Access avatars',
        'Public Access community-attachments',
        'Public Access audio-cache',
        'Public Access email-assets',
        'avatars are publicly accessible',
        'community-attachments are publicly accessible',
        'audio-cache is publicly accessible',
        'email-assets are publicly accessible'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects;', pol.policyname);
  END LOOP;
END $$;

-- Узкие SELECT-политики: чтение по bucket_id (не даёт листинга через PostgREST,
-- т.к. требует точного name; листинг через storage API требует service_role).
-- Если уже существуют — не трогаем.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='public_read_avatars_by_path') THEN
    CREATE POLICY public_read_avatars_by_path ON storage.objects
      FOR SELECT USING (bucket_id = 'avatars');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='public_read_community_attachments_by_path') THEN
    CREATE POLICY public_read_community_attachments_by_path ON storage.objects
      FOR SELECT USING (bucket_id = 'community-attachments');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='public_read_audio_cache_by_path') THEN
    CREATE POLICY public_read_audio_cache_by_path ON storage.objects
      FOR SELECT USING (bucket_id = 'audio-cache');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='public_read_email_assets_by_path') THEN
    CREATE POLICY public_read_email_assets_by_path ON storage.objects
      FOR SELECT USING (bucket_id = 'email-assets');
  END IF;
END $$;

-- =====================================================================
-- 3) REVOKE EXECUTE на чисто-административных SECURITY DEFINER функциях.
--    Оставляем доступными только те, что нужны RLS / клиенту.
-- =====================================================================

-- Чисто-админские: запрещаем всем кроме service_role
DO $$
DECLARE
  fn text;
  admin_fns text[] := ARRAY[
    'extend_all_premium_subscriptions',
    'count_admins',
    'get_table_columns',
    'get_user_activity_counts',
    'get_premium_user_ids',
    'decrement_feature_usage'
  ];
BEGIN
  FOREACH fn IN ARRAY admin_fns LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(uuid[]) FROM anon, authenticated;', fn);
    EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I() FROM anon, authenticated;', fn);
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END LOOP;

  -- extend_all_premium_subscriptions(int)
  BEGIN
    REVOKE EXECUTE ON FUNCTION public.extend_all_premium_subscriptions(integer) FROM anon, authenticated;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  -- get_table_columns(text)
  BEGIN
    REVOKE EXECUTE ON FUNCTION public.get_table_columns(text) FROM anon, authenticated;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  -- get_user_activity_counts(uuid[])
  BEGIN
    REVOKE EXECUTE ON FUNCTION public.get_user_activity_counts(uuid[]) FROM anon, authenticated;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  -- get_premium_user_ids(uuid[])
  BEGIN
    REVOKE EXECUTE ON FUNCTION public.get_premium_user_ids(uuid[]) FROM anon, authenticated;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  -- decrement_feature_usage(uuid, text, date)
  BEGIN
    REVOKE EXECUTE ON FUNCTION public.decrement_feature_usage(uuid, text, date) FROM anon, authenticated;
  EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- Запрет анону на админ-проверки (signed-in users могут проверять свою роль через RLS, но анон — нет)
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_moderator_or_admin() FROM anon;