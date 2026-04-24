-- RLS policies for user_roles table to restrict role management to admins only

-- Only admins can insert new roles
CREATE POLICY "Admins can insert user_roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Only admins can delete roles
CREATE POLICY "Admins can delete user_roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.is_admin());

-- Only admins can update roles
CREATE POLICY "Admins can update user_roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (public.is_admin());

-- Admins and moderators can read all roles (needed for permission checks)
CREATE POLICY "Mods and admins can read all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.is_moderator_or_admin());