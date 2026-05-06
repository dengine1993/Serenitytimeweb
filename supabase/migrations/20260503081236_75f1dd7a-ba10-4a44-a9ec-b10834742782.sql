UPDATE auth.identities
SET identity_data = COALESCE(identity_data, '{}'::jsonb) || jsonb_build_object('email', 'admin@newdawnjourney.com'),
    updated_at = now()
WHERE user_id = 'fa59e071-0a6a-4cbe-855e-4ffd1f3915c9'
  AND provider = 'email';

UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('email', 'admin@newdawnjourney.com'),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE id = 'fa59e071-0a6a-4cbe-855e-4ffd1f3915c9';