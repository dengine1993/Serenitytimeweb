-- Enable pg_net extension for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function to call finalize-trial-session edge function
CREATE OR REPLACE FUNCTION public.trigger_finalize_trial_session()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
BEGIN
  -- Only trigger when session is finalized (purchased or completed)
  IF (NEW.purchased_at IS NOT NULL AND OLD.purchased_at IS NULL)
     OR (NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL) THEN
    
    -- Get Supabase URL from environment
    v_supabase_url := 'https://hvtpfbfawhmkvjtcyaxs.supabase.co';
    
    -- Call the edge function asynchronously
    PERFORM extensions.http_post(
      url := v_supabase_url || '/functions/v1/finalize-trial-session',
      body := jsonb_build_object('session_id', NEW.id)::text,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      )::jsonb
    );
    
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'finalize-trial-session call failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger on trial_sessions
DROP TRIGGER IF EXISTS on_trial_session_finalized ON public.trial_sessions;
CREATE TRIGGER on_trial_session_finalized
  AFTER UPDATE ON public.trial_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_finalize_trial_session();