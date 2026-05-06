DO $$
DECLARE
  r record;
BEGIN
  RAISE NOTICE '=== ALWAYS-TRUE POLICIES ===';
  FOR r IN
    SELECT schemaname, tablename, policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname IN ('public','storage')
      AND cmd IN ('INSERT','UPDATE','DELETE')
      AND ((qual IS NOT NULL AND qual ILIKE '%true%' AND length(regexp_replace(qual,'\s','','g')) <= 6)
           OR (with_check IS NOT NULL AND with_check ILIKE '%true%' AND length(regexp_replace(with_check,'\s','','g')) <= 6))
  LOOP
    RAISE NOTICE 'POLICY %.%: % cmd=% qual=% with_check=%', r.schemaname, r.tablename, r.policyname, r.cmd, r.qual, r.with_check;
  END LOOP;

  RAISE NOTICE '=== PUBLIC BUCKET LISTING POLICIES ===';
  FOR r IN
    SELECT policyname, qual, with_check FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects' AND cmd='SELECT'
  LOOP
    RAISE NOTICE 'STORAGE POLICY %: qual=%', r.policyname, r.qual;
  END LOOP;

  RAISE NOTICE '=== RLS-ENABLED-NO-POLICY TABLES ===';
  FOR r IN
    SELECT c.relname
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity=true
      AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename=c.relname)
  LOOP
    RAISE NOTICE 'TABLE WITHOUT POLICIES: public.%', r.relname;
  END LOOP;

  RAISE NOTICE '=== ANON-EXECUTABLE SECURITY DEFINER FUNCTIONS ===';
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef = true
      AND has_function_privilege('anon', p.oid, 'EXECUTE')
  LOOP
    RAISE NOTICE 'ANON CAN CALL: %.%(%)', r.nspname, r.proname, r.args;
  END LOOP;
END $$;