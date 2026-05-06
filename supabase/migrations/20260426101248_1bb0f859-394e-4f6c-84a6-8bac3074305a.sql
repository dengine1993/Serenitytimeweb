-- Indices for hot queries
CREATE INDEX IF NOT EXISTS idx_private_messages_conv_created 
  ON public.private_messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pinned_community_messages_pinned_at 
  ON public.pinned_community_messages(pinned_at DESC);

CREATE INDEX IF NOT EXISTS idx_friendships_friend_status 
  ON public.friendships(friend_id, status);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
  ON public.notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_messages_created 
  ON public.community_messages(created_at DESC);

-- Trigger: prevent recipients from modifying message content while marking as read
CREATE OR REPLACE FUNCTION public.private_messages_protect_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only sender can change content/media; recipients can only update read_at
  IF auth.uid() <> OLD.sender_id THEN
    IF NEW.content IS DISTINCT FROM OLD.content
       OR NEW.media_url IS DISTINCT FROM OLD.media_url
       OR NEW.media_type IS DISTINCT FROM OLD.media_type
       OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
       OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id THEN
      RAISE EXCEPTION 'Only sender can modify message content';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_private_messages_protect ON public.private_messages;
CREATE TRIGGER trg_private_messages_protect
  BEFORE UPDATE ON public.private_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.private_messages_protect_immutable();

-- RPC: efficient conversations list with last message and unread count
CREATE OR REPLACE FUNCTION public.get_conversations_with_last_message(p_user_id uuid)
RETURNS TABLE(
  conversation_id uuid,
  user_id_1 uuid,
  user_id_2 uuid,
  status text,
  conv_created_at timestamptz,
  conv_updated_at timestamptz,
  last_content text,
  last_media_url text,
  last_sender_id uuid,
  last_created_at timestamptz,
  unread_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;