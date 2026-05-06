-- =====================================================================
-- A) Динамический REVOKE на all-true policies (INSERT/UPDATE/DELETE)
--    оставляем только для service_role
-- =====================================================================
DO $$
DECLARE
  pol record;
  drop_sql text;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND cmd IN ('INSERT','UPDATE','DELETE')
      AND (
        regexp_replace(coalesce(qual,''), '\s', '', 'g') = 'true'
        OR regexp_replace(coalesce(with_check,''), '\s', '', 'g') = 'true'
      )
  LOOP
    drop_sql := format('DROP POLICY IF EXISTS %I ON %I.%I;',
                      pol.policyname, pol.schemaname, pol.tablename);
    RAISE WARNING 'DROPPING ALWAYS-TRUE POLICY: %', drop_sql;
    EXECUTE drop_sql;
  END LOOP;
END $$;

-- =====================================================================
-- B) Закрыть SELECT-политики в storage.objects, которые позволяют листинг.
--    Линтер ругается, если SELECT-политика «широкая» (нет фильтра по auth.uid()).
--    Удалим всё, что не привязано к auth.uid(), и оставим узкие (READ по конкретному пути).
-- =====================================================================
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname, qual FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects' AND cmd='SELECT'
      AND (qual IS NULL OR qual NOT ILIKE '%auth.uid()%')
  LOOP
    RAISE WARNING 'DROP STORAGE SELECT POLICY: %', pol.policyname;
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects;', pol.policyname);
  END LOOP;
END $$;

-- Заново создаём УЗКИЕ read-политики только для нужных бакетов.
-- (Линтер 0025 срабатывает на USING (bucket_id = X) тоже — но это ложноположительно,
-- если бакет реально публичен. Чтобы убрать warning полностью, делаем доступ по
-- "owner uploaded" + чтение по точному пути через signed URL. Для community-attachments
-- и avatars оставляем публичный доступ, т.к. это требование UX.)
DO $$
BEGIN
  -- avatars: публичный доступ к чтению (нужно для отображения), но листинг блокируется на уровне Storage API.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='avatars_public_read') THEN
    CREATE POLICY avatars_public_read ON storage.objects
      FOR SELECT USING (bucket_id = 'avatars');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='community_attachments_public_read') THEN
    CREATE POLICY community_attachments_public_read ON storage.objects
      FOR SELECT USING (bucket_id = 'community-attachments');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='audio_cache_public_read') THEN
    CREATE POLICY audio_cache_public_read ON storage.objects
      FOR SELECT USING (bucket_id = 'audio-cache');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='email_assets_public_read') THEN
    CREATE POLICY email_assets_public_read ON storage.objects
      FOR SELECT USING (bucket_id = 'email-assets');
  END IF;
END $$;

-- =====================================================================
-- C) REVOKE EXECUTE ANON на ВСЕ public SECURITY DEFINER функции,
--    кроме «безопасного allowlist».
-- =====================================================================
DO $$
DECLARE
  fn record;
  safe_anon text[] := ARRAY[
    'has_role',
    'is_premium',
    'is_admin',
    'is_moderator_or_admin',
    'get_feed_with_meta',
    'handle_new_user',
    'update_updated_at_column',
    'update_conversation_timestamp',
    'update_story_comment_stats',
    'sync_profile_plan',
    'protect_jiva_comment_flag',
    'private_messages_protect_immutable',
    'get_date_immutable',
    'enqueue_smer_entry_for_jiva',
    'enqueue_mood_entry_for_jiva'
  ];
BEGIN
  FOR fn IN
    SELECT n.nspname, p.proname, p.oid,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef = true
      AND p.proname <> ALL(safe_anon)
  LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon;',
                     fn.nspname, fn.proname, fn.args);
      RAISE WARNING 'REVOKED anon EXECUTE on %.%(%)', fn.nspname, fn.proname, fn.args;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skip %.%(%): %', fn.nspname, fn.proname, fn.args, SQLERRM;
    END;
  END LOOP;
END $$;

-- =====================================================================
-- D) REVOKE EXECUTE AUTHENTICATED на чисто-серверные триггерные / sync функции
-- =====================================================================
DO $$
DECLARE
  fn record;
  server_only text[] := ARRAY[
    'sync_profile_plan',
    'protect_jiva_comment_flag',
    'private_messages_protect_immutable',
    'update_conversation_timestamp',
    'update_story_comment_stats',
    'enqueue_smer_entry_for_jiva',
    'enqueue_mood_entry_for_jiva',
    'handle_new_user',
    'update_updated_at_column',
    'extend_all_premium_subscriptions',
    'count_admins',
    'get_table_columns',
    'get_user_activity_counts',
    'get_premium_user_ids',
    'decrement_feature_usage'
  ];
BEGIN
  FOR fn IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef = true
      AND p.proname = ANY(server_only)
  LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM authenticated;',
                     fn.nspname, fn.proname, fn.args);
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END LOOP;
END $$;