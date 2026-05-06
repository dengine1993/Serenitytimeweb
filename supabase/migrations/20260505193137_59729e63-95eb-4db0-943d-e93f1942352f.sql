-- 1. Add per-type push toggles
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS push_dm boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_admin boolean NOT NULL DEFAULT true;

-- 2. Admin broadcasts audit table
CREATE TABLE IF NOT EXISTS public.admin_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  url text,
  audience text NOT NULL CHECK (audience IN ('all','premium','free','user_ids')),
  audience_user_ids uuid[],
  urgent boolean NOT NULL DEFAULT false,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read broadcasts"
  ON public.admin_broadcasts FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "admins insert broadcasts"
  ON public.admin_broadcasts FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin() AND created_by = auth.uid());

CREATE INDEX IF NOT EXISTS idx_admin_broadcasts_created_at
  ON public.admin_broadcasts (created_at DESC);