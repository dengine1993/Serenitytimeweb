-- Add message length constraints to prevent abuse
ALTER TABLE community_messages 
ADD CONSTRAINT community_messages_content_length 
CHECK (char_length(content) <= 2000);

ALTER TABLE private_messages 
ADD CONSTRAINT private_messages_content_length 
CHECK (char_length(content) <= 2000);

-- Add index for faster user-based queries and deletions
CREATE INDEX IF NOT EXISTS idx_community_messages_user_id 
ON community_messages(user_id);

-- Add index for message reports by status
CREATE INDEX IF NOT EXISTS idx_message_reports_status 
ON message_reports(status);

-- Drop overly permissive UPDATE policy on private_messages
DROP POLICY IF EXISTS "Users can update their own messages" ON private_messages;

-- Create restrictive UPDATE policy only for marking as read
CREATE POLICY "Recipients can mark messages as read"
ON private_messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM private_conversations c
    WHERE c.id = private_messages.conversation_id
    AND (c.user_id_1 = auth.uid() OR c.user_id_2 = auth.uid())
  )
  AND sender_id != auth.uid()
)
WITH CHECK (
  read_at IS NOT NULL
);

-- Create rate-limited function for sending community messages
CREATE OR REPLACE FUNCTION send_community_message(
  p_content TEXT,
  p_media_url TEXT DEFAULT NULL,
  p_media_type TEXT DEFAULT NULL,
  p_reply_to_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_last_message_at TIMESTAMPTZ;
  v_message_id UUID;
BEGIN
  -- Rate limit: max 1 message per 2 seconds
  SELECT created_at INTO v_last_message_at
  FROM community_messages
  WHERE user_id = auth.uid()
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_last_message_at IS NOT NULL AND 
     v_last_message_at > NOW() - INTERVAL '2 seconds' THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please wait.';
  END IF;
  
  -- Content length check
  IF char_length(p_content) > 2000 THEN
    RAISE EXCEPTION 'Message too long. Max 2000 characters.';
  END IF;
  
  -- Empty content check (unless media attached)
  IF p_content IS NULL OR (char_length(TRIM(p_content)) = 0 AND p_media_url IS NULL) THEN
    RAISE EXCEPTION 'Message cannot be empty.';
  END IF;
  
  INSERT INTO community_messages (user_id, content, media_url, media_type, reply_to_id)
  VALUES (auth.uid(), TRIM(p_content), p_media_url, p_media_type, p_reply_to_id)
  RETURNING id INTO v_message_id;
  
  RETURN v_message_id;
END;
$$;