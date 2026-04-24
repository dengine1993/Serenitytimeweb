-- Add timezone field to profiles for user-local daily limit resets
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Europe/Moscow';

-- Add comment
COMMENT ON COLUMN public.profiles.timezone IS 'User timezone for daily limit calculations (IANA format)';