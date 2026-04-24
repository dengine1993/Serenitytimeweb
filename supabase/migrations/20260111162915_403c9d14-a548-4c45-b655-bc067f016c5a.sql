-- Add column for friend request privacy setting
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS allow_friend_requests text NOT NULL DEFAULT 'all';

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.allow_friend_requests IS 'Privacy setting for friend requests: all, nobody';