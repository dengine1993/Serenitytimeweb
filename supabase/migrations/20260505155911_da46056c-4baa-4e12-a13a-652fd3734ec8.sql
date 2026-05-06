-- M5: device fingerprint для защиты от обхода триала
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS device_id TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_device_id
  ON public.profiles (device_id)
  WHERE device_id IS NOT NULL;