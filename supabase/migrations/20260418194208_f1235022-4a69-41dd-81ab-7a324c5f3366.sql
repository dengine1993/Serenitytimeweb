-- Promote the existing moderator account to admin (project no longer uses moderator role)
UPDATE public.user_roles
SET role = 'admin'
WHERE user_id = 'fa59e071-0a6a-4cbe-855e-4ffd1f3915c9'
  AND role = 'moderator';

-- Safety net: ensure an admin row exists for that user even if the UPDATE matched nothing
INSERT INTO public.user_roles (user_id, role)
SELECT 'fa59e071-0a6a-4cbe-855e-4ffd1f3915c9', 'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = 'fa59e071-0a6a-4cbe-855e-4ffd1f3915c9' AND role = 'admin'
);