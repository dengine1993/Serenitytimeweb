ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS name_to_jiva_consent_at timestamptz;