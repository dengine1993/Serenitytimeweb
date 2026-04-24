-- Add extended registration fields and daily reset tracking to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS birth_year INT,
ADD COLUMN IF NOT EXISTS gender_extended TEXT,
ADD COLUMN IF NOT EXISTS last_daily_reset TIMESTAMPTZ;

-- Add demographic columns to session_evaluations for ML context
ALTER TABLE public.session_evaluations
ADD COLUMN IF NOT EXISTS user_country TEXT,
ADD COLUMN IF NOT EXISTS user_city TEXT,
ADD COLUMN IF NOT EXISTS user_birth_year INT,
ADD COLUMN IF NOT EXISTS user_gender TEXT,
ADD COLUMN IF NOT EXISTS user_timezone TEXT;

-- Create index for last_daily_reset for efficient lookups
CREATE INDEX IF NOT EXISTS idx_profiles_last_daily_reset ON public.profiles(last_daily_reset);

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.country IS 'User country (private, not visible to others)';
COMMENT ON COLUMN public.profiles.city IS 'User city (private, not visible to others)';
COMMENT ON COLUMN public.profiles.birth_year IS 'User birth year for age calculation (private)';
COMMENT ON COLUMN public.profiles.gender_extended IS 'User gender: male, female, other, prefer_not_to_say (private)';
COMMENT ON COLUMN public.profiles.last_daily_reset IS 'Timestamp of last daily limit reset (7:00 AM local time)';