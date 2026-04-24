-- Add cancelled_at column to subscriptions table
ALTER TABLE public.subscriptions 
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;