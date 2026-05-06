CREATE OR REPLACE FUNCTION public.get_user_activity_counts(p_user_ids uuid[])
RETURNS TABLE(user_id uuid, posts_count bigint, ai_messages_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    u AS user_id,
    (SELECT count(*) FROM public.posts WHERE posts.user_id = u) AS posts_count,
    (SELECT count(*) FROM public.ai_messages WHERE ai_messages.user_id = u) AS ai_messages_count
  FROM unnest(p_user_ids) AS u
  WHERE public.has_role(auth.uid(), 'admin'::public.app_role);
$$;