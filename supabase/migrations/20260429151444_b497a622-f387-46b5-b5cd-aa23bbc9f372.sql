DROP FUNCTION IF EXISTS public.get_feed_with_meta(uuid, timestamp with time zone, integer);

CREATE OR REPLACE FUNCTION public.get_feed_with_meta(
  p_viewer_id uuid DEFAULT NULL::uuid,
  p_cursor timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_limit integer DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  content text,
  emotion text,
  emotion_wave text,
  is_anonymous boolean,
  moderation_status text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  author_display_name text,
  author_avatar_url text,
  author_anon_alias text,
  author_anon_emoji text,
  author_anon_color text,
  heart_count bigint,
  comment_count bigint,
  viewer_reacted boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    p.id,
    p.user_id,
    p.content,
    p.emotion,
    p.emotion_wave,
    p.is_anonymous,
    p.moderation_status,
    p.created_at,
    p.updated_at,
    pr.display_name AS author_display_name,
    pr.avatar_url   AS author_avatar_url,
    pr.anon_alias   AS author_anon_alias,
    pr.anon_emoji   AS author_anon_emoji,
    pr.anon_color   AS author_anon_color,
    COALESCE(r.heart_count, 0)   AS heart_count,
    COALESCE(c.comment_count, 0) AS comment_count,
    COALESCE(vr.reacted, false)  AS viewer_reacted
  FROM public.posts p
  LEFT JOIN public.profiles pr
    ON pr.user_id = p.user_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint AS heart_count
    FROM public.post_reactions x
    WHERE x.post_id = p.id AND x.reaction_type = 'support'
  ) r ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint AS comment_count
    FROM public.post_comments x
    WHERE x.post_id = p.id
  ) c ON true
  LEFT JOIN LATERAL (
    SELECT true AS reacted
    FROM public.post_reactions x
    WHERE x.post_id = p.id
      AND x.reaction_type = 'support'
      AND p_viewer_id IS NOT NULL
      AND x.user_id = p_viewer_id
    LIMIT 1
  ) vr ON true
  WHERE p.moderation_status = 'approved'
    AND (p_cursor IS NULL OR p.created_at < p_cursor)
  ORDER BY p.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 10), 50));
$function$;