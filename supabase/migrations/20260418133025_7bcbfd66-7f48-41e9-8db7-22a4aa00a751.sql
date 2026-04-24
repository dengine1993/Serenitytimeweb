-- 1) Перенос: на всякий случай продублировать всех is_admin=true в user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'admin'
FROM public.profiles
WHERE is_admin = true
ON CONFLICT (user_id, role) DO NOTHING;

-- 2) Переписать RLS политики, использующие profiles.is_admin, на функцию is_admin()

-- admin_logs
DROP POLICY IF EXISTS "Admins can create admin logs" ON public.admin_logs;
DROP POLICY IF EXISTS "Admins can view admin logs" ON public.admin_logs;

CREATE POLICY "Admins can create admin logs"
ON public.admin_logs
FOR INSERT
TO public
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can view admin logs"
ON public.admin_logs
FOR SELECT
TO public
USING (public.is_admin());

-- pinned_community_messages
DROP POLICY IF EXISTS "Only admins can pin messages" ON public.pinned_community_messages;
DROP POLICY IF EXISTS "Only admins can unpin messages" ON public.pinned_community_messages;

CREATE POLICY "Only admins can pin messages"
ON public.pinned_community_messages
FOR INSERT
TO public
WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can unpin messages"
ON public.pinned_community_messages
FOR DELETE
TO public
USING (public.is_admin());

-- 3) Удалить колонку profiles.is_admin
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_admin;