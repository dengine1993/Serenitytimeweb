-- ============ SNOS ANONYMITY ============
-- Drop tables
DROP TABLE IF EXISTS public.mask_lifts CASCADE;

-- Drop helper functions
DROP FUNCTION IF EXISTS public.is_revealed_to(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_displayed_authors(uuid, uuid[]) CASCADE;
DROP FUNCTION IF EXISTS public.generate_anon_persona() CASCADE;
DROP FUNCTION IF EXISTS public.generate_anon_persona(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.trigger_generate_anon_persona() CASCADE;

-- Drop persona columns from profiles
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS anon_alias,
  DROP COLUMN IF EXISTS anon_emoji,
  DROP COLUMN IF EXISTS anon_color;

-- Drop anonymity flags everywhere
ALTER TABLE public.posts             DROP COLUMN IF EXISTS is_anonymous;
ALTER TABLE public.post_comments     DROP COLUMN IF EXISTS is_anonymous;
ALTER TABLE public.community_messages DROP COLUMN IF EXISTS is_anonymous;
ALTER TABLE public.user_stories      DROP COLUMN IF EXISTS is_anonymous;
ALTER TABLE public.story_comments    DROP COLUMN IF EXISTS is_anonymous;
ALTER TABLE public.private_conversations
  DROP COLUMN IF EXISTS is_anonymous,
  DROP COLUMN IF EXISTS revealed_at;
ALTER TABLE public.private_messages  DROP COLUMN IF EXISTS sender_revealed;

-- Recreate get_feed_with_meta without anon fields
DROP FUNCTION IF EXISTS public.get_feed_with_meta(uuid, timestamptz, integer);
CREATE OR REPLACE FUNCTION public.get_feed_with_meta(
  p_viewer_id uuid DEFAULT NULL,
  p_cursor timestamptz DEFAULT NULL,
  p_limit integer DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  content text,
  emotion text,
  emotion_wave text,
  moderation_status text,
  created_at timestamptz,
  updated_at timestamptz,
  author_display_name text,
  author_avatar_url text,
  heart_count bigint,
  comment_count bigint,
  viewer_reacted boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    p.id, p.user_id, p.content, p.emotion, p.emotion_wave,
    p.moderation_status, p.created_at, p.updated_at,
    pr.display_name AS author_display_name,
    pr.avatar_url   AS author_avatar_url,
    COALESCE(r.heart_count, 0)   AS heart_count,
    COALESCE(c.comment_count, 0) AS comment_count,
    COALESCE(vr.reacted, false)  AS viewer_reacted
  FROM public.posts p
  LEFT JOIN public.profiles pr ON pr.user_id = p.user_id
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
$$;

-- Drop send_community_message anon overload (keep base 4-arg version)
DROP FUNCTION IF EXISTS public.send_community_message(text, text, text, uuid, boolean);
