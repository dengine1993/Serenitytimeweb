-- Add friend_intro_shown column to profiles for welcome modal tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS friend_intro_shown BOOLEAN DEFAULT false;