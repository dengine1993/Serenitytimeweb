-- Add RLS policies for admins to manage subscriptions
CREATE POLICY "Admins can insert subscriptions"
ON public.subscriptions
FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Admins can update subscriptions"
ON public.subscriptions
FOR UPDATE
USING (is_admin());