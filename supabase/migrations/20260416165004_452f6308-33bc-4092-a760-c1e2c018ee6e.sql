-- Allow users to update and delete their own crisis sessions
CREATE POLICY "Users can update their own crisis sessions"
ON public.crisis_sessions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own crisis sessions"
ON public.crisis_sessions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);