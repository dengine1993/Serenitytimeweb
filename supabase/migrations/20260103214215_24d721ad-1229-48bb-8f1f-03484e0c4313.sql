-- Create immutable function for extracting date from timestamp
CREATE OR REPLACE FUNCTION public.get_date_immutable(ts timestamptz)
RETURNS date
LANGUAGE sql
IMMUTABLE PARALLEL SAFE
AS $$
  SELECT (ts AT TIME ZONE 'UTC')::date;
$$;

-- Remove duplicate posts (keep only the first post per user per day)
DELETE FROM public.posts p1
USING public.posts p2
WHERE p1.id > p2.id 
  AND p1.user_id = p2.user_id 
  AND (p1.created_at AT TIME ZONE 'UTC')::date = (p2.created_at AT TIME ZONE 'UTC')::date;

-- Now create unique constraint using immutable function
CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_user_daily 
ON public.posts (user_id, public.get_date_immutable(created_at));