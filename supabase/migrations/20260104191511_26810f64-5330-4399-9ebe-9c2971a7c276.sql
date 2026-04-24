-- RLS policies for app_config table (admin only write access)
-- The table already has read access, we need to add write policies for admins

-- Allow admins to insert into app_config
CREATE POLICY "Admins can insert app_config"
ON public.app_config FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Allow admins to update app_config
CREATE POLICY "Admins can update app_config"
ON public.app_config FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Allow admins to delete from app_config
CREATE POLICY "Admins can delete app_config"
ON public.app_config FOR DELETE
TO authenticated
USING (public.is_admin());