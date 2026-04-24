-- Recreate INSERT policy for story_comments to ensure it works for authenticated users
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.story_comments;

CREATE POLICY "Users can create their own comments"
ON public.story_comments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.user_stories s
    WHERE s.id = story_comments.story_id
      AND s.is_hidden = false
  )
);