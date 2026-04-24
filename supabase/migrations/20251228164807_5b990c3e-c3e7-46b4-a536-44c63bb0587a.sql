-- Функция проверки admin роли (security definer для избежания рекурсии RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
$$;

-- RLS политики для admin_settings: INSERT
CREATE POLICY "Admins can insert settings" ON public.admin_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- RLS политики для admin_settings: UPDATE
CREATE POLICY "Admins can update settings" ON public.admin_settings
  FOR UPDATE TO authenticated
  USING (public.is_admin());

-- RLS политики для admin_settings: DELETE
CREATE POLICY "Admins can delete settings" ON public.admin_settings
  FOR DELETE TO authenticated
  USING (public.is_admin());