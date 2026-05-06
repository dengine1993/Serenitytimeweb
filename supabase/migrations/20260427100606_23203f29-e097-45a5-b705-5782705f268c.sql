CREATE OR REPLACE FUNCTION public.count_admins()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer FROM public.user_roles WHERE role = 'admin';
$$;

REVOKE ALL ON FUNCTION public.count_admins() FROM public;
GRANT EXECUTE ON FUNCTION public.count_admins() TO authenticated;