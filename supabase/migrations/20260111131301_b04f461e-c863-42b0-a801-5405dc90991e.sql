-- Create notification preferences table
CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Push preferences by type (what to send as push)
  push_friend_requests boolean DEFAULT true,
  push_private_messages boolean DEFAULT true,
  push_mentions boolean DEFAULT true,
  push_reactions boolean DEFAULT false,
  push_comments boolean DEFAULT false,
  
  -- Sound preferences  
  sound_enabled boolean DEFAULT true,
  vibration_enabled boolean DEFAULT true,
  
  -- Quiet hours
  quiet_hours_enabled boolean DEFAULT false,
  quiet_hours_start time DEFAULT '23:00',
  quiet_hours_end time DEFAULT '08:00',
  
  -- Aggregation
  aggregate_reactions boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view own preferences" 
ON public.notification_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own preferences" 
ON public.notification_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own preferences" 
ON public.notification_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_notification_preferences_user ON public.notification_preferences(user_id);

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_preferences;