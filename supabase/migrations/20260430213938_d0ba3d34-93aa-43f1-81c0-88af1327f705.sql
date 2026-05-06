
-- Drop sender_revealed/revealed_at if still present
ALTER TABLE public.private_messages DROP COLUMN IF EXISTS sender_revealed;
ALTER TABLE public.private_messages DROP COLUMN IF EXISTS revealed_at;
ALTER TABLE public.private_conversations DROP COLUMN IF EXISTS is_anonymous;

-- Recreate RPC without anonymity fields
DROP FUNCTION IF EXISTS public.get_conversations_with_last_message(uuid);

CREATE OR REPLACE FUNCTION public.get_conversations_with_last_message(p_user_id uuid)
RETURNS TABLE(
  conversation_id uuid,
  user_id_1 uuid,
  user_id_2 uuid,
  status text,
  conv_created_at timestamp with time zone,
  conv_updated_at timestamp with time zone,
  last_content text,
  last_media_url text,
  last_sender_id uuid,
  last_created_at timestamp with time zone,
  unread_count bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    c.id AS conversation_id,
    c.user_id_1,
    c.user_id_2,
    c.status,
    c.created_at AS conv_created_at,
    c.updated_at AS conv_updated_at,
    lm.content AS last_content,
    lm.media_url AS last_media_url,
    lm.sender_id AS last_sender_id,
    lm.created_at AS last_created_at,
    COALESCE((
      SELECT count(*)
      FROM private_messages pm
      WHERE pm.conversation_id = c.id
        AND pm.sender_id <> p_user_id
        AND pm.read_at IS NULL
    ), 0) AS unread_count
  FROM private_conversations c
  LEFT JOIN LATERAL (
    SELECT content, media_url, sender_id, created_at
    FROM private_messages
    WHERE conversation_id = c.id
    ORDER BY created_at DESC
    LIMIT 1
  ) lm ON true
  WHERE (c.user_id_1 = p_user_id OR c.user_id_2 = p_user_id)
    AND c.status = 'active'
  ORDER BY COALESCE(lm.created_at, c.updated_at) DESC;
$function$;
