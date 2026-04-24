-- Add missing columns to session_evaluations
ALTER TABLE public.session_evaluations 
ADD COLUMN IF NOT EXISTS user_onboarding_state JSONB,
ADD COLUMN IF NOT EXISTS days_since_registration INT;

-- Add missing columns to trial_sessions
ALTER TABLE public.trial_sessions 
ADD COLUMN IF NOT EXISTS user_country TEXT,
ADD COLUMN IF NOT EXISTS user_city TEXT,
ADD COLUMN IF NOT EXISTS user_birth_year INT,
ADD COLUMN IF NOT EXISTS user_gender TEXT,
ADD COLUMN IF NOT EXISTS user_timezone TEXT,
ADD COLUMN IF NOT EXISTS user_onboarding_state JSONB,
ADD COLUMN IF NOT EXISTS days_since_registration INT;

-- Function to populate trial session demographics
CREATE OR REPLACE FUNCTION public.populate_trial_session_demographics()
RETURNS TRIGGER AS $$
BEGIN
  SELECT 
    country, 
    city, 
    birth_year, 
    gender_extended, 
    timezone, 
    onboarding_state,
    EXTRACT(DAY FROM NEW.started_at - created_at)::INT
  INTO 
    NEW.user_country, 
    NEW.user_city, 
    NEW.user_birth_year, 
    NEW.user_gender, 
    NEW.user_timezone, 
    NEW.user_onboarding_state,
    NEW.days_since_registration
  FROM profiles 
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for auto-populating demographics
DROP TRIGGER IF EXISTS trg_populate_trial_demographics ON trial_sessions;
CREATE TRIGGER trg_populate_trial_demographics
BEFORE INSERT ON trial_sessions
FOR EACH ROW EXECUTE FUNCTION populate_trial_session_demographics();