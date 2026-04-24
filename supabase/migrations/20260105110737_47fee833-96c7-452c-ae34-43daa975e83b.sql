-- =====================================================
-- Объединение Multiple Permissive Policies (49 warnings)
-- =====================================================

-- 1. app_config (SELECT)
DROP POLICY IF EXISTS "Admins can read all config" ON app_config;
DROP POLICY IF EXISTS "Anyone can read non-secret config" ON app_config;

CREATE POLICY "Select app_config" ON app_config FOR SELECT
USING (
  (key !~~* '%secret%'::text)
  OR (select public.is_admin())
);

-- 2. comment_reports (SELECT)
DROP POLICY IF EXISTS "Moderators can view all comment reports" ON comment_reports;
DROP POLICY IF EXISTS "Users can view their own comment reports" ON comment_reports;

CREATE POLICY "Select comment_reports" ON comment_reports FOR SELECT
USING (
  (select auth.uid()) = reporter_id
  OR (select public.is_moderator_or_admin())
);

-- 3. community_messages (DELETE + SELECT)
DROP POLICY IF EXISTS "Moderators can delete any community messages" ON community_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON community_messages;

CREATE POLICY "Delete community_messages" ON community_messages FOR DELETE
USING (
  (select auth.uid()) = user_id
  OR (select public.is_moderator_or_admin())
);

DROP POLICY IF EXISTS "Authenticated users can view messages" ON community_messages;
DROP POLICY IF EXISTS "Moderators can view all community messages" ON community_messages;

CREATE POLICY "Select community_messages" ON community_messages FOR SELECT
USING (true);

-- 4. message_reports (SELECT)
DROP POLICY IF EXISTS "Moderators can view all message reports" ON message_reports;
DROP POLICY IF EXISTS "Users can view their own reports" ON message_reports;

CREATE POLICY "Select message_reports" ON message_reports FOR SELECT
USING (
  (select auth.uid()) = reporter_id
  OR (select public.is_moderator_or_admin())
);

-- 5. post_comments (DELETE)
DROP POLICY IF EXISTS "Moderators can delete any comments" ON post_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON post_comments;

CREATE POLICY "Delete post_comments" ON post_comments FOR DELETE
USING (
  (select auth.uid()) = user_id
  OR (select public.is_moderator_or_admin())
);

-- 6. post_reports (SELECT)
DROP POLICY IF EXISTS "Moderators can view all post reports" ON post_reports;
DROP POLICY IF EXISTS "Users can view their own post reports" ON post_reports;

CREATE POLICY "Select post_reports" ON post_reports FOR SELECT
USING (
  (select auth.uid()) = reporter_id
  OR (select public.is_moderator_or_admin())
);

-- 7. posts (DELETE + SELECT + UPDATE)
DROP POLICY IF EXISTS "Moderators can delete any posts" ON posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;

CREATE POLICY "Delete posts" ON posts FOR DELETE
USING (
  (select auth.uid()) = user_id
  OR (select public.is_moderator_or_admin())
);

DROP POLICY IF EXISTS "Authenticated users can view approved posts" ON posts;
DROP POLICY IF EXISTS "Moderators can view all posts" ON posts;

CREATE POLICY "Select posts" ON posts FOR SELECT
USING (
  moderation_status = 'approved'
  OR (select auth.uid()) = user_id
  OR (select public.is_moderator_or_admin())
);

DROP POLICY IF EXISTS "Moderators can update any posts" ON posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;

CREATE POLICY "Update posts" ON posts FOR UPDATE
USING (
  (select auth.uid()) = user_id
  OR (select public.is_moderator_or_admin())
);

-- 8. profiles (SELECT)
DROP POLICY IF EXISTS "Moderators can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

CREATE POLICY "Select profiles" ON profiles FOR SELECT
USING (
  (select auth.uid()) = user_id
  OR (select public.is_moderator_or_admin())
);

-- 9. soul_profiles (SELECT) - нужно проверить существующие политики
DROP POLICY IF EXISTS "Users can manage their own soul profile" ON soul_profiles;
DROP POLICY IF EXISTS "Users can view active soul profiles" ON soul_profiles;

CREATE POLICY "Manage own soul_profile" ON soul_profiles
FOR ALL USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Select soul_profiles" ON soul_profiles FOR SELECT
USING (
  is_active = true
  OR (select auth.uid()) = user_id
);

-- 10. user_roles (SELECT)
DROP POLICY IF EXISTS "Mods and admins can read all roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;

CREATE POLICY "Select user_roles" ON user_roles FOR SELECT
USING (
  (select auth.uid()) = user_id
  OR (select public.is_moderator_or_admin())
);