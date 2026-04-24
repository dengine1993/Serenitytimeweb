-- Allow users to update their own community messages
CREATE POLICY "Users can update their own messages" 
ON public.community_messages 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);