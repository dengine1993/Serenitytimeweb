-- Create app_role enum if not exists
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create moderation_history table
CREATE TABLE IF NOT EXISTS public.moderation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  moderator_id uuid NOT NULL,
  action_type text NOT NULL,
  reason text,
  content_type text,
  content_preview text,
  created_at timestamptz DEFAULT now()
);

-- Add temp_bans_count to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS temp_bans_count integer DEFAULT 0;

-- Enable RLS on moderation_history
ALTER TABLE public.moderation_history ENABLE ROW LEVEL SECURITY;

-- Create has_role function (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role::text
  )
$$;

-- Create is_moderator_or_admin function
CREATE OR REPLACE FUNCTION public.is_moderator_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
  )
$$;

-- RLS policies for moderation_history
CREATE POLICY "Admins and moderators can view moderation history"
ON public.moderation_history
FOR SELECT
USING (public.is_moderator_or_admin());

CREATE POLICY "Admins and moderators can create moderation history"
ON public.moderation_history
FOR INSERT
WITH CHECK (public.is_moderator_or_admin());

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_moderation_history_user_id ON public.moderation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_history_moderator_id ON public.moderation_history(moderator_id);
CREATE INDEX IF NOT EXISTS idx_moderation_history_created_at ON public.moderation_history(created_at DESC);