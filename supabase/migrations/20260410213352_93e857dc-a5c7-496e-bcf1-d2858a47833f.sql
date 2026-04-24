DROP POLICY IF EXISTS "Users can update own art therapy entries" ON public.user_art_therapy_entries;
DROP POLICY IF EXISTS "Users can update their own art entries" ON public.user_art_therapy_entries;

CREATE POLICY "Users can update their own art entries"
ON public.user_art_therapy_entries
FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);