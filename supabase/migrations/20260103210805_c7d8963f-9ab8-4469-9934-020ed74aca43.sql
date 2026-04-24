-- Create comment_reports table for reporting comments on posts
CREATE TABLE public.comment_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id uuid NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
    reporter_id uuid NOT NULL,
    reason text NOT NULL,
    details text,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.comment_reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "Users can create comment reports"
ON public.comment_reports
FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view their own comment reports"
ON public.comment_reports
FOR SELECT
USING (auth.uid() = reporter_id);

-- Admins and moderators can view all reports
CREATE POLICY "Moderators can view all comment reports"
ON public.comment_reports
FOR SELECT
USING (is_moderator_or_admin());

-- Admins and moderators can update reports
CREATE POLICY "Moderators can update comment reports"
ON public.comment_reports
FOR UPDATE
USING (is_moderator_or_admin());

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.comment_reports;