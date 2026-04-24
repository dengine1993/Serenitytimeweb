-- PHASE 1: Remove dangerous public policy from profiles
DROP POLICY IF EXISTS "Public can view minimal profile data" ON public.profiles;

-- PHASE 2: Fix RLS policies to require authentication

-- posts
DROP POLICY IF EXISTS "Authenticated users can view approved posts" ON public.posts;
CREATE POLICY "Authenticated users can view approved posts" ON public.posts
FOR SELECT TO authenticated
USING ((moderation_status = 'approved') OR (auth.uid() = user_id));

-- community_messages
DROP POLICY IF EXISTS "Authenticated users can view messages" ON public.community_messages;
CREATE POLICY "Authenticated users can view messages" ON public.community_messages
FOR SELECT TO authenticated
USING (true);

-- post_comments
DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.post_comments;
CREATE POLICY "Authenticated users can view comments" ON public.post_comments
FOR SELECT TO authenticated
USING (true);

-- post_reactions
DROP POLICY IF EXISTS "Authenticated users can view reactions" ON public.post_reactions;
CREATE POLICY "Authenticated users can view reactions" ON public.post_reactions
FOR SELECT TO authenticated
USING (true);

-- message_reactions
DROP POLICY IF EXISTS "Authenticated users can view reactions" ON public.message_reactions;
CREATE POLICY "Authenticated users can view reactions" ON public.message_reactions
FOR SELECT TO authenticated
USING (true);

-- message_read_receipts
DROP POLICY IF EXISTS "Authenticated users can view read receipts" ON public.message_read_receipts;
CREATE POLICY "Authenticated users can view read receipts" ON public.message_read_receipts
FOR SELECT TO authenticated
USING (true);

-- pinned_moments
DROP POLICY IF EXISTS "Authenticated users can view pinned moments" ON public.pinned_moments;
CREATE POLICY "Authenticated users can view pinned moments" ON public.pinned_moments
FOR SELECT TO authenticated
USING (true);

-- pinned_community_messages
DROP POLICY IF EXISTS "Authenticated users can view pinned messages" ON public.pinned_community_messages;
CREATE POLICY "Authenticated users can view pinned messages" ON public.pinned_community_messages
FOR SELECT TO authenticated
USING (true);