-- Add welcome_shown field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS welcome_shown boolean DEFAULT false;