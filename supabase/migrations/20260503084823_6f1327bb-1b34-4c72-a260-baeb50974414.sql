-- 1. Функция синхронизации display_name из profiles в auth.users metadata
CREATE OR REPLACE FUNCTION public.sync_display_name_to_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.display_name IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.display_name IS DISTINCT FROM OLD.display_name) THEN
    UPDATE auth.users
    SET raw_user_meta_data =
      COALESCE(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object('display_name', NEW.display_name)
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'sync_display_name_to_auth failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- 2. Триггеры на public.profiles
DROP TRIGGER IF EXISTS sync_display_name_to_auth_upd ON public.profiles;
CREATE TRIGGER sync_display_name_to_auth_upd
AFTER UPDATE OF display_name ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_display_name_to_auth();

DROP TRIGGER IF EXISTS sync_display_name_to_auth_ins ON public.profiles;
CREATE TRIGGER sync_display_name_to_auth_ins
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_display_name_to_auth();

-- 3. Бэкфилл: синхронизируем все существующие расхождения
UPDATE auth.users u
SET raw_user_meta_data =
  COALESCE(u.raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object('display_name', p.display_name)
FROM public.profiles p
WHERE p.user_id = u.id
  AND p.display_name IS NOT NULL
  AND COALESCE(u.raw_user_meta_data->>'display_name', '') IS DISTINCT FROM p.display_name;