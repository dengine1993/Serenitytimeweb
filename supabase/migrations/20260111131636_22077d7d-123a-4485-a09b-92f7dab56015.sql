-- Create user reports table for complaints about users
CREATE TABLE public.user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  resolution_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "Users can create reports"
ON public.user_reports
FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view own reports"
ON public.user_reports
FOR SELECT
USING (auth.uid() = reporter_id);

-- Moderators and admins can view all reports
CREATE POLICY "Moderators can view all reports"
ON public.user_reports
FOR SELECT
USING (public.is_moderator_or_admin());

-- Moderators and admins can update reports
CREATE POLICY "Moderators can update reports"
ON public.user_reports
FOR UPDATE
USING (public.is_moderator_or_admin());

-- Create index for faster queries
CREATE INDEX idx_user_reports_status ON public.user_reports(status);
CREATE INDEX idx_user_reports_reported_user ON public.user_reports(reported_user_id);
CREATE INDEX idx_user_reports_created ON public.user_reports(created_at DESC);

-- Add to realtime for moderators
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_reports;

-- Create trigger for updated_at
CREATE TRIGGER update_user_reports_updated_at
BEFORE UPDATE ON public.user_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();