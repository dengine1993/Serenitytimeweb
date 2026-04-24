
DO $$
DECLARE
  v_user_id uuid;
  v_existing_id uuid;
BEGIN
  -- Check if user already exists
  SELECT id INTO v_existing_id FROM auth.users WHERE email = 'admin@serenitypeople.ru';

  IF v_existing_id IS NOT NULL THEN
    v_user_id := v_existing_id;
    RAISE NOTICE 'User already exists with id %, ensuring admin role', v_user_id;
  ELSE
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      'admin@serenitypeople.ru',
      crypt('missionserenity1993', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"display_name":"Administrator","username":"admin"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      v_user_id::text,
      format('{"sub":"%s","email":"%s","email_verified":true}', v_user_id, 'admin@serenitypeople.ru')::jsonb,
      'email',
      now(),
      now(),
      now()
    );
  END IF;

  -- Ensure profile exists (in case trigger didn't fire)
  INSERT INTO public.profiles (user_id, display_name, username, created_at, updated_at)
  VALUES (v_user_id, 'Administrator', 'admin', now(), now())
  ON CONFLICT (user_id) DO NOTHING;

  -- Assign admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE NOTICE 'Admin user ready: %', v_user_id;
END $$;
