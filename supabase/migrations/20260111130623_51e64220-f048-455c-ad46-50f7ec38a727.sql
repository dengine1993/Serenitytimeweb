-- Add new columns for enhanced notifications
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS action_url text,
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON notifications(user_id, is_read) 
WHERE is_read = false;