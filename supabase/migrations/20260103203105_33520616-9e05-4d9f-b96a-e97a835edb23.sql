-- Add community restriction field to profiles for temporary bans
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS community_restricted_until timestamp with time zone DEFAULT NULL;

-- Add warnings count for community violations (separate from abuse_warnings_count which is for AI usage)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS community_warnings_count integer DEFAULT 0;

-- Add last warning date to track warnings
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_community_warning_at timestamp with time zone DEFAULT NULL;