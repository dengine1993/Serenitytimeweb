-- Create post_reports table for reporting posts
CREATE TABLE public.post_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    reporter_id uuid NOT NULL,
    reason text NOT NULL,
    details text,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "Users can create post reports"
ON public.post_reports
FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view their own post reports"
ON public.post_reports
FOR SELECT
USING (auth.uid() = reporter_id);

-- Admins and moderators can view all reports
CREATE POLICY "Moderators can view all post reports"
ON public.post_reports
FOR SELECT
USING (is_moderator_or_admin());

-- Admins and moderators can update reports
CREATE POLICY "Moderators can update post reports"
ON public.post_reports
FOR UPDATE
USING (is_moderator_or_admin());

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_reports;