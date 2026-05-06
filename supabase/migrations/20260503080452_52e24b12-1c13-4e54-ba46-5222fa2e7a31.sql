-- Sync auth.users display_name & email with public.profiles
-- Data-only update; no schema changes.

-- 1) Jiva bot
UPDATE auth.users
SET raw_user_meta_data =
      COALESCE(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object('display_name', 'Джива'),
    email = 'jiva@newdawnjourney.com',
    updated_at = now()
WHERE id = '00000000-0000-0000-0000-000000000001';

UPDATE public.profiles
SET display_name = 'Джива',
    username = 'jiva',
    updated_at = now()
WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- 2) Admin (Lekha)
UPDATE auth.users
SET raw_user_meta_data =
      COALESCE(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object('display_name', 'Lekha'),
    updated_at = now()
WHERE id = 'fa59e071-0a6a-4cbe-855e-4ffd1f3915c9';