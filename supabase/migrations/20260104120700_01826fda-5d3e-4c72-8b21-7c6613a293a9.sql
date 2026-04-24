-- Performance indexes for critical queries
-- researcher_messages: история чата (ORDER BY created_at DESC)
CREATE INDEX IF NOT EXISTS idx_researcher_messages_user_created 
ON researcher_messages (user_id, created_at DESC);

-- mood_entries: дневник настроения (ORDER BY entry_date DESC)
CREATE INDEX IF NOT EXISTS idx_mood_entries_user_date 
ON mood_entries (user_id, entry_date DESC);

-- community_messages: чат по комнатам (ORDER BY created_at DESC)
CREATE INDEX IF NOT EXISTS idx_community_messages_room_created 
ON community_messages (room, created_at DESC);

-- subscriptions: проверка Premium статуса
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status 
ON subscriptions (user_id, status);

-- posts: лента по волнам (ORDER BY created_at DESC)
CREATE INDEX IF NOT EXISTS idx_posts_wave_created 
ON posts (emotion_wave, created_at DESC) WHERE moderation_status = 'approved';

-- feature_usage: проверка лимитов
CREATE INDEX IF NOT EXISTS idx_feature_usage_user_feature_date 
ON feature_usage (user_id, feature, usage_date);