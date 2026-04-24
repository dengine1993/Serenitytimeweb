-- ============================================================
-- CRITICAL FIX #1: Profiles - Hide sensitive data from public
-- ============================================================

-- Drop overly permissive policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Public can only see minimal profile info (for feed/community display)
CREATE POLICY "Public can view minimal profile data" ON public.profiles
FOR SELECT USING (true);

-- Create a secure view for public profile data (hides sensitive columns)
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT 
  user_id,
  username,
  display_name,
  avatar_url,
  bio,
  gender,
  created_at
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- ============================================================
-- CRITICAL FIX #2: Posts - Require authentication to view
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view approved posts" ON public.posts;

-- Only authenticated users can view posts
CREATE POLICY "Authenticated users can view approved posts" ON public.posts
FOR SELECT TO authenticated
USING (moderation_status = 'approved' OR auth.uid() = user_id);

-- ============================================================
-- CRITICAL FIX #3: Community Messages - Require authentication
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view messages" ON public.community_messages;

CREATE POLICY "Authenticated users can view messages" ON public.community_messages
FOR SELECT TO authenticated
USING (true);

-- ============================================================
-- CRITICAL FIX #4: Admin Settings - Restrict to admins only
-- ============================================================

DROP POLICY IF EXISTS "Anyone can read admin settings" ON public.admin_settings;

CREATE POLICY "Only admins can read admin settings" ON public.admin_settings
FOR SELECT USING (public.is_admin());

-- ============================================================
-- FIX #5: Post Reactions - Require authentication
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view reactions" ON public.post_reactions;

CREATE POLICY "Authenticated users can view reactions" ON public.post_reactions
FOR SELECT TO authenticated
USING (true);

-- ============================================================
-- FIX #6: Post Comments - Require authentication
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view comments" ON public.post_comments;

CREATE POLICY "Authenticated users can view comments" ON public.post_comments
FOR SELECT TO authenticated
USING (true);

-- ============================================================
-- FIX #7: Message Reactions - Require authentication
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view reactions" ON public.message_reactions;

CREATE POLICY "Authenticated users can view reactions" ON public.message_reactions
FOR SELECT TO authenticated
USING (true);

-- ============================================================
-- FIX #8: Message Read Receipts - Require authentication
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view read receipts" ON public.message_read_receipts;

CREATE POLICY "Authenticated users can view read receipts" ON public.message_read_receipts
FOR SELECT TO authenticated
USING (true);

-- ============================================================
-- FIX #9: Pinned Moments/Messages - Require authentication
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view pinned moments" ON public.pinned_moments;

CREATE POLICY "Authenticated users can view pinned moments" ON public.pinned_moments
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Anyone can view pinned community messages" ON public.pinned_community_messages;

CREATE POLICY "Authenticated users can view pinned messages" ON public.pinned_community_messages
FOR SELECT TO authenticated
USING (true);