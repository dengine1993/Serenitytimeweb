-- Create private_conversations table
CREATE TABLE public.private_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id_1 UUID NOT NULL,
  user_id_2 UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_conversation UNIQUE (user_id_1, user_id_2),
  CONSTRAINT different_users CHECK (user_id_1 <> user_id_2)
);

-- Create private_messages table
CREATE TABLE public.private_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.private_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create private_chat_requests table
CREATE TABLE public.private_chat_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT unique_pending_request UNIQUE (sender_id, receiver_id),
  CONSTRAINT different_users_request CHECK (sender_id <> receiver_id)
);

-- Create indexes for performance
CREATE INDEX idx_private_conversations_user1 ON public.private_conversations(user_id_1);
CREATE INDEX idx_private_conversations_user2 ON public.private_conversations(user_id_2);
CREATE INDEX idx_private_messages_conversation ON public.private_messages(conversation_id);
CREATE INDEX idx_private_messages_created ON public.private_messages(created_at DESC);
CREATE INDEX idx_private_chat_requests_receiver ON public.private_chat_requests(receiver_id, status);
CREATE INDEX idx_private_chat_requests_sender ON public.private_chat_requests(sender_id);

-- Enable RLS
ALTER TABLE public.private_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_chat_requests ENABLE ROW LEVEL SECURITY;

-- RLS for private_conversations: Only participants can see/manage
CREATE POLICY "Users can view their own conversations"
ON public.private_conversations FOR SELECT
USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

CREATE POLICY "Users can create conversations"
ON public.private_conversations FOR INSERT
WITH CHECK (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

CREATE POLICY "Users can update their own conversations"
ON public.private_conversations FOR UPDATE
USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

CREATE POLICY "Users can delete their own conversations"
ON public.private_conversations FOR DELETE
USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- RLS for private_messages: Only conversation participants can see
CREATE POLICY "Users can view messages in their conversations"
ON public.private_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.private_conversations c
    WHERE c.id = conversation_id
    AND (c.user_id_1 = auth.uid() OR c.user_id_2 = auth.uid())
  )
);

CREATE POLICY "Users can send messages in their conversations"
ON public.private_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.private_conversations c
    WHERE c.id = conversation_id
    AND (c.user_id_1 = auth.uid() OR c.user_id_2 = auth.uid())
  )
);

CREATE POLICY "Users can update their own messages"
ON public.private_messages FOR UPDATE
USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages"
ON public.private_messages FOR DELETE
USING (auth.uid() = sender_id);

-- RLS for private_chat_requests
CREATE POLICY "Users can view requests involving them"
ON public.private_chat_requests FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create requests"
ON public.private_chat_requests FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Receivers can update request status"
ON public.private_chat_requests FOR UPDATE
USING (auth.uid() = receiver_id);

CREATE POLICY "Senders can delete pending requests"
ON public.private_chat_requests FOR DELETE
USING (auth.uid() = sender_id AND status = 'pending');

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.private_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.private_chat_requests;

-- Trigger to update conversation updated_at
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.private_conversations 
  SET updated_at = now() 
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_conversation_on_message
AFTER INSERT ON public.private_messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_timestamp();