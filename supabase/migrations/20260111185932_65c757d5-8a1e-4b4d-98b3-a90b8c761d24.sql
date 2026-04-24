-- Add email_weekly_digest column to notification_preferences table
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS email_weekly_digest boolean DEFAULT true;