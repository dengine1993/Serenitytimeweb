-- Политики DELETE для модераторов - удаление любого контента
CREATE POLICY "Moderators can delete any community messages"
ON public.community_messages FOR DELETE
TO authenticated
USING (public.is_moderator_or_admin());

CREATE POLICY "Moderators can delete any posts"
ON public.posts FOR DELETE
TO authenticated
USING (public.is_moderator_or_admin());

CREATE POLICY "Moderators can delete any comments"
ON public.post_comments FOR DELETE
TO authenticated
USING (public.is_moderator_or_admin());

-- Политика UPDATE для постов (модерация статуса)
CREATE POLICY "Moderators can update any posts"
ON public.posts FOR UPDATE
TO authenticated
USING (public.is_moderator_or_admin());

-- Политики SELECT для модераторов - просмотр всего контента
CREATE POLICY "Moderators can view all community messages"
ON public.community_messages FOR SELECT
TO authenticated
USING (public.is_moderator_or_admin());

CREATE POLICY "Moderators can view all posts"
ON public.posts FOR SELECT
TO authenticated
USING (public.is_moderator_or_admin());

CREATE POLICY "Moderators can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_moderator_or_admin());

CREATE POLICY "Moderators can view all message reports"
ON public.message_reports FOR SELECT
TO authenticated
USING (public.is_moderator_or_admin());

CREATE POLICY "Moderators can update message reports"
ON public.message_reports FOR UPDATE
TO authenticated
USING (public.is_moderator_or_admin());