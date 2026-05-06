
-- 1. Restrict "always true" policies to service_role
DROP POLICY IF EXISTS "Service role full access sessions" ON public.trial_sessions;
CREATE POLICY "Service role full access sessions" ON public.trial_sessions
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access messages" ON public.trial_messages;
CREATE POLICY "Service role full access messages" ON public.trial_messages
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access events" ON public.trial_events;
CREATE POLICY "Service role full access events" ON public.trial_events
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access examples" ON public.training_examples;
CREATE POLICY "Service role full access examples" ON public.training_examples
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. Revoke EXECUTE on sensitive SECURITY DEFINER functions from public roles.
DO $$
DECLARE
  fn text;
  internal_fns text[] := ARRAY[
    'extend_all_premium_subscriptions(integer)',
    'get_user_activity_counts(uuid[])',
    'get_table_columns(text)',
    'decrement_feature_usage(uuid,text,date)',
    'increment_feature_usage(uuid,text,integer,integer)',
    'check_feature_limit(uuid,text,integer,integer)',
    'increment_jiva_reply_usage(uuid,text,date,integer)',
    'start_or_increment_jiva_trial(uuid,uuid,date,integer)',
    'search_jiva_memories(uuid,extensions.vector,integer)',
    'count_admins()',
    'get_premium_user_ids(uuid[])',
    'sync_profile_plan()',
    'sync_display_name_to_auth()',
    'handle_new_user()',
    'enqueue_mood_entry_for_jiva()',
    'set_edited_at_on_content_change()',
    'private_messages_protect_immutable()',
    'protect_jiva_comment_flag()',
    'update_conversation_timestamp()',
    'update_story_comment_stats()',
    'update_updated_at_column()',
    'get_date_immutable(timestamp with time zone)'
  ];
BEGIN
  FOREACH fn IN ARRAY internal_fns LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'Function not found, skipping: %', fn;
    END;
  END LOOP;
END$$;
