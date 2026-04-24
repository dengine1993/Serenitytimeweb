-- Enable pg_net extension for async HTTP calls (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create function to trigger auto-comment via Edge Function
CREATE OR REPLACE FUNCTION public.trigger_auto_comment_on_post()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supabase_url text;
  internal_secret text;
BEGIN
  -- Get configuration from app settings
  SELECT value INTO supabase_url FROM app_config WHERE key = 'supabase_url';
  SELECT value INTO internal_secret FROM app_config WHERE key = 'internal_function_secret';
  
  -- If no config, use defaults (failsafe)
  IF supabase_url IS NULL THEN
    supabase_url := 'https://hvtpfbfawhmkvjtcyaxs.supabase.co';
  END IF;
  
  -- Only proceed if we have the secret
  IF internal_secret IS NOT NULL THEN
    PERFORM extensions.http_post(
      url := supabase_url || '/functions/v1/auto-comment-post',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Internal-Secret', internal_secret
      ),
      body := jsonb_build_object(
        'postId', NEW.id::text,
        'postContent', NEW.content
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on posts table
DROP TRIGGER IF EXISTS on_post_created_auto_comment ON public.posts;
CREATE TRIGGER on_post_created_auto_comment
  AFTER INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_auto_comment_on_post();