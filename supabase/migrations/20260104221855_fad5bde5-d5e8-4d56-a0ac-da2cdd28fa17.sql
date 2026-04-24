
-- Fix RLS policies with (select auth.uid()) optimization
-- This improves performance by evaluating auth functions once per query instead of per row

-- Phase 1: Drop duplicate index
DROP INDEX IF EXISTS idx_feature_usage_user_date;

-- ============================================
-- TABLE: ab_tests
-- ============================================
DROP POLICY IF EXISTS "Users can create their own ab tests" ON ab_tests;
DROP POLICY IF EXISTS "Users can view their own ab tests" ON ab_tests;

CREATE POLICY "Users can create their own ab tests" ON ab_tests FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can view their own ab tests" ON ab_tests FOR SELECT USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: admin_logs
-- ============================================
DROP POLICY IF EXISTS "Admins can create admin logs" ON admin_logs;
DROP POLICY IF EXISTS "Admins can view admin logs" ON admin_logs;

CREATE POLICY "Admins can create admin logs" ON admin_logs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = (select auth.uid()) AND profiles.is_admin = true)
);
CREATE POLICY "Admins can view admin logs" ON admin_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = (select auth.uid()) AND profiles.is_admin = true)
);

-- ============================================
-- TABLE: admin_settings
-- ============================================
DROP POLICY IF EXISTS "Admins can delete settings" ON admin_settings;
DROP POLICY IF EXISTS "Admins can insert settings" ON admin_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON admin_settings;
DROP POLICY IF EXISTS "Only admins can read admin settings" ON admin_settings;

CREATE POLICY "Admins can delete settings" ON admin_settings FOR DELETE USING ((select is_admin()));
CREATE POLICY "Admins can insert settings" ON admin_settings FOR INSERT WITH CHECK ((select is_admin()));
CREATE POLICY "Admins can update settings" ON admin_settings FOR UPDATE USING ((select is_admin()));
CREATE POLICY "Only admins can read admin settings" ON admin_settings FOR SELECT USING ((select is_admin()));

-- ============================================
-- TABLE: ai_chats
-- ============================================
DROP POLICY IF EXISTS "Users can create their own chats" ON ai_chats;
DROP POLICY IF EXISTS "Users can delete their own chats" ON ai_chats;
DROP POLICY IF EXISTS "Users can update their own chats" ON ai_chats;
DROP POLICY IF EXISTS "Users can view their own chats" ON ai_chats;

CREATE POLICY "Users can create their own chats" ON ai_chats FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete their own chats" ON ai_chats FOR DELETE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can update their own chats" ON ai_chats FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can view their own chats" ON ai_chats FOR SELECT USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: ai_messages
-- ============================================
DROP POLICY IF EXISTS "Users can create their own messages" ON ai_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON ai_messages;
DROP POLICY IF EXISTS "Users can view their own messages" ON ai_messages;

CREATE POLICY "Users can create their own messages" ON ai_messages FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete their own messages" ON ai_messages FOR DELETE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can view their own messages" ON ai_messages FOR SELECT USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: app_config
-- ============================================
DROP POLICY IF EXISTS "Admins can delete app_config" ON app_config;
DROP POLICY IF EXISTS "Admins can insert app_config" ON app_config;
DROP POLICY IF EXISTS "Admins can update app_config" ON app_config;
DROP POLICY IF EXISTS "Admins can read all config" ON app_config;

CREATE POLICY "Admins can delete app_config" ON app_config FOR DELETE USING ((select is_admin()));
CREATE POLICY "Admins can insert app_config" ON app_config FOR INSERT WITH CHECK ((select is_admin()));
CREATE POLICY "Admins can update app_config" ON app_config FOR UPDATE USING ((select is_admin()));
CREATE POLICY "Admins can read all config" ON app_config FOR SELECT USING ((select is_admin()));

-- ============================================
-- TABLE: art_therapy_sessions
-- ============================================
DROP POLICY IF EXISTS "Users can create their own art sessions" ON art_therapy_sessions;
DROP POLICY IF EXISTS "Users can delete their own art sessions" ON art_therapy_sessions;
DROP POLICY IF EXISTS "Users can view their own art sessions" ON art_therapy_sessions;

CREATE POLICY "Users can create their own art sessions" ON art_therapy_sessions FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete their own art sessions" ON art_therapy_sessions FOR DELETE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can view their own art sessions" ON art_therapy_sessions FOR SELECT USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: comment_reports
-- ============================================
DROP POLICY IF EXISTS "Moderators can update comment reports" ON comment_reports;
DROP POLICY IF EXISTS "Moderators can view all comment reports" ON comment_reports;
DROP POLICY IF EXISTS "Users can create comment reports" ON comment_reports;
DROP POLICY IF EXISTS "Users can view their own comment reports" ON comment_reports;

CREATE POLICY "Moderators can update comment reports" ON comment_reports FOR UPDATE USING ((select is_moderator_or_admin()));
CREATE POLICY "Moderators can view all comment reports" ON comment_reports FOR SELECT USING ((select is_moderator_or_admin()));
CREATE POLICY "Users can create comment reports" ON comment_reports FOR INSERT WITH CHECK ((select auth.uid()) = reporter_id);
CREATE POLICY "Users can view their own comment reports" ON comment_reports FOR SELECT USING ((select auth.uid()) = reporter_id);

-- ============================================
-- TABLE: community_messages
-- ============================================
DROP POLICY IF EXISTS "Moderators can delete any community messages" ON community_messages;
DROP POLICY IF EXISTS "Moderators can view all community messages" ON community_messages;
DROP POLICY IF EXISTS "Users can create messages" ON community_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON community_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON community_messages;

CREATE POLICY "Moderators can delete any community messages" ON community_messages FOR DELETE USING ((select is_moderator_or_admin()));
CREATE POLICY "Moderators can view all community messages" ON community_messages FOR SELECT USING ((select is_moderator_or_admin()));
CREATE POLICY "Users can create messages" ON community_messages FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete their own messages" ON community_messages FOR DELETE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can update their own messages" ON community_messages FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: community_rules_accepted
-- ============================================
DROP POLICY IF EXISTS "Users can create their own acceptance" ON community_rules_accepted;
DROP POLICY IF EXISTS "Users can view their own acceptance" ON community_rules_accepted;

CREATE POLICY "Users can create their own acceptance" ON community_rules_accepted FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can view their own acceptance" ON community_rules_accepted FOR SELECT USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: consent_log
-- ============================================
DROP POLICY IF EXISTS "Users can insert own consent log" ON consent_log;
DROP POLICY IF EXISTS "Users can view own consent log" ON consent_log;

CREATE POLICY "Users can insert own consent log" ON consent_log FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can view own consent log" ON consent_log FOR SELECT USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: crisis_sessions
-- ============================================
DROP POLICY IF EXISTS "Users can create their own crisis sessions" ON crisis_sessions;
DROP POLICY IF EXISTS "Users can view their own crisis sessions" ON crisis_sessions;

CREATE POLICY "Users can create their own crisis sessions" ON crisis_sessions FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can view their own crisis sessions" ON crisis_sessions FOR SELECT USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: daily_checkins
-- ============================================
DROP POLICY IF EXISTS "Users can create their own checkins" ON daily_checkins;
DROP POLICY IF EXISTS "Users can update their own checkins" ON daily_checkins;
DROP POLICY IF EXISTS "Users can view their own checkins" ON daily_checkins;

CREATE POLICY "Users can create their own checkins" ON daily_checkins FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update their own checkins" ON daily_checkins FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can view their own checkins" ON daily_checkins FOR SELECT USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: emotion_calendar
-- ============================================
DROP POLICY IF EXISTS "Users can create emotion entries" ON emotion_calendar;
DROP POLICY IF EXISTS "Users can delete their own emotion entries" ON emotion_calendar;
DROP POLICY IF EXISTS "Users can update their own emotion entries" ON emotion_calendar;
DROP POLICY IF EXISTS "Users can view their own emotion calendar" ON emotion_calendar;

CREATE POLICY "Users can create emotion entries" ON emotion_calendar FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete their own emotion entries" ON emotion_calendar FOR DELETE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can update their own emotion entries" ON emotion_calendar FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can view their own emotion calendar" ON emotion_calendar FOR SELECT USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: feature_usage
-- ============================================
DROP POLICY IF EXISTS "Users can view their own feature usage" ON feature_usage;

CREATE POLICY "Users can view their own feature usage" ON feature_usage FOR SELECT USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: jiva_memory_chunks
-- ============================================
DROP POLICY IF EXISTS "Users can create their own memory chunks" ON jiva_memory_chunks;
DROP POLICY IF EXISTS "Users can delete their own memory chunks" ON jiva_memory_chunks;
DROP POLICY IF EXISTS "Users can view their own memory chunks" ON jiva_memory_chunks;

CREATE POLICY "Users can create their own memory chunks" ON jiva_memory_chunks FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete their own memory chunks" ON jiva_memory_chunks FOR DELETE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can view their own memory chunks" ON jiva_memory_chunks FOR SELECT USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: jiva_sessions_v2
-- ============================================
DROP POLICY IF EXISTS "Users can create their own jiva sessions" ON jiva_sessions_v2;
DROP POLICY IF EXISTS "Users can view their own jiva sessions" ON jiva_sessions_v2;

CREATE POLICY "Users can create their own jiva sessions" ON jiva_sessions_v2 FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can view their own jiva sessions" ON jiva_sessions_v2 FOR SELECT USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: llm_usage
-- ============================================
DROP POLICY IF EXISTS "Users can create their own llm usage" ON llm_usage;
DROP POLICY IF EXISTS "Users can view their own llm usage" ON llm_usage;

CREATE POLICY "Users can create their own llm usage" ON llm_usage FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can view their own llm usage" ON llm_usage FOR SELECT USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: message_reactions
-- ============================================
DROP POLICY IF EXISTS "Users can create reactions" ON message_reactions;
DROP POLICY IF EXISTS "Users can delete their own reactions" ON message_reactions;

CREATE POLICY "Users can create reactions" ON message_reactions FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete their own reactions" ON message_reactions FOR DELETE USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: message_read_receipts
-- ============================================
DROP POLICY IF EXISTS "Users can create read receipts" ON message_read_receipts;

CREATE POLICY "Users can create read receipts" ON message_read_receipts FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: message_reports
-- ============================================
DROP POLICY IF EXISTS "Moderators can update message reports" ON message_reports;
DROP POLICY IF EXISTS "Moderators can view all message reports" ON message_reports;
DROP POLICY IF EXISTS "Users can create reports" ON message_reports;
DROP POLICY IF EXISTS "Users can view their own reports" ON message_reports;

CREATE POLICY "Moderators can update message reports" ON message_reports FOR UPDATE USING ((select is_moderator_or_admin()));
CREATE POLICY "Moderators can view all message reports" ON message_reports FOR SELECT USING ((select is_moderator_or_admin()));
CREATE POLICY "Users can create reports" ON message_reports FOR INSERT WITH CHECK ((select auth.uid()) = reporter_id);
CREATE POLICY "Users can view their own reports" ON message_reports FOR SELECT USING ((select auth.uid()) = reporter_id);

-- ============================================
-- TABLE: moderation_history
-- ============================================
DROP POLICY IF EXISTS "Admins and moderators can create moderation history" ON moderation_history;
DROP POLICY IF EXISTS "Admins and moderators can view moderation history" ON moderation_history;

CREATE POLICY "Admins and moderators can create moderation history" ON moderation_history FOR INSERT WITH CHECK ((select is_moderator_or_admin()));
CREATE POLICY "Admins and moderators can view moderation history" ON moderation_history FOR SELECT USING ((select is_moderator_or_admin()));

-- ============================================
-- TABLE: mood_entries
-- ============================================
DROP POLICY IF EXISTS "Users can create their own mood entries" ON mood_entries;
DROP POLICY IF EXISTS "Users can delete their own mood entries" ON mood_entries;
DROP POLICY IF EXISTS "Users can update their own mood entries" ON mood_entries;
DROP POLICY IF EXISTS "Users can view their own mood entries" ON mood_entries;

CREATE POLICY "Users can create their own mood entries" ON mood_entries FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete their own mood entries" ON mood_entries FOR DELETE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can update their own mood entries" ON mood_entries FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can view their own mood entries" ON mood_entries FOR SELECT USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: notifications
-- ============================================
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;

CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: payments
-- ============================================
DROP POLICY IF EXISTS "Users can view their own payments" ON payments;

CREATE POLICY "Users can view their own payments" ON payments FOR SELECT USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: pinned_community_messages
-- ============================================
DROP POLICY IF EXISTS "Only admins can pin messages" ON pinned_community_messages;
DROP POLICY IF EXISTS "Only admins can unpin messages" ON pinned_community_messages;

CREATE POLICY "Only admins can pin messages" ON pinned_community_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = (select auth.uid()) AND profiles.is_admin = true)
);
CREATE POLICY "Only admins can unpin messages" ON pinned_community_messages FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = (select auth.uid()) AND profiles.is_admin = true)
);

-- ============================================
-- TABLE: post_comments
-- ============================================
DROP POLICY IF EXISTS "Moderators can delete any comments" ON post_comments;
DROP POLICY IF EXISTS "Users can create comments" ON post_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON post_comments;

CREATE POLICY "Moderators can delete any comments" ON post_comments FOR DELETE USING ((select is_moderator_or_admin()));
CREATE POLICY "Users can create comments" ON post_comments FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete their own comments" ON post_comments FOR DELETE USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: post_reactions
-- ============================================
DROP POLICY IF EXISTS "Users can create reactions" ON post_reactions;
DROP POLICY IF EXISTS "Users can delete their own reactions" ON post_reactions;

CREATE POLICY "Users can create reactions" ON post_reactions FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete their own reactions" ON post_reactions FOR DELETE USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: post_reports
-- ============================================
DROP POLICY IF EXISTS "Moderators can update post reports" ON post_reports;
DROP POLICY IF EXISTS "Moderators can view all post reports" ON post_reports;
DROP POLICY IF EXISTS "Users can create post reports" ON post_reports;
DROP POLICY IF EXISTS "Users can view their own post reports" ON post_reports;

CREATE POLICY "Moderators can update post reports" ON post_reports FOR UPDATE USING ((select is_moderator_or_admin()));
CREATE POLICY "Moderators can view all post reports" ON post_reports FOR SELECT USING ((select is_moderator_or_admin()));
CREATE POLICY "Users can create post reports" ON post_reports FOR INSERT WITH CHECK ((select auth.uid()) = reporter_id);
CREATE POLICY "Users can view their own post reports" ON post_reports FOR SELECT USING ((select auth.uid()) = reporter_id);

-- ============================================
-- TABLE: posts
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view approved posts" ON posts;
DROP POLICY IF EXISTS "Moderators can delete any posts" ON posts;
DROP POLICY IF EXISTS "Moderators can update any posts" ON posts;
DROP POLICY IF EXISTS "Moderators can view all posts" ON posts;
DROP POLICY IF EXISTS "Users can create their own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;

CREATE POLICY "Authenticated users can view approved posts" ON posts FOR SELECT USING (
  moderation_status = 'approved' OR (select auth.uid()) = user_id
);
CREATE POLICY "Moderators can delete any posts" ON posts FOR DELETE USING ((select is_moderator_or_admin()));
CREATE POLICY "Moderators can update any posts" ON posts FOR UPDATE USING ((select is_moderator_or_admin()));
CREATE POLICY "Moderators can view all posts" ON posts FOR SELECT USING ((select is_moderator_or_admin()));
CREATE POLICY "Users can create their own posts" ON posts FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete their own posts" ON posts FOR DELETE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can update their own posts" ON posts FOR UPDATE USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: private_chat_requests
-- ============================================
DROP POLICY IF EXISTS "Receivers can update request status" ON private_chat_requests;
DROP POLICY IF EXISTS "Senders can delete pending requests" ON private_chat_requests;
DROP POLICY IF EXISTS "Users can create requests" ON private_chat_requests;
DROP POLICY IF EXISTS "Users can view requests involving them" ON private_chat_requests;

CREATE POLICY "Receivers can update request status" ON private_chat_requests FOR UPDATE USING ((select auth.uid()) = receiver_id);
CREATE POLICY "Senders can delete pending requests" ON private_chat_requests FOR DELETE USING ((select auth.uid()) = sender_id AND status = 'pending');
CREATE POLICY "Users can create requests" ON private_chat_requests FOR INSERT WITH CHECK ((select auth.uid()) = sender_id);
CREATE POLICY "Users can view requests involving them" ON private_chat_requests FOR SELECT USING ((select auth.uid()) = sender_id OR (select auth.uid()) = receiver_id);

-- ============================================
-- TABLE: private_conversations
-- ============================================
DROP POLICY IF EXISTS "Users can create conversations" ON private_conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON private_conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON private_conversations;
DROP POLICY IF EXISTS "Users can view their own conversations" ON private_conversations;

CREATE POLICY "Users can create conversations" ON private_conversations FOR INSERT WITH CHECK ((select auth.uid()) = user_id_1 OR (select auth.uid()) = user_id_2);
CREATE POLICY "Users can delete their own conversations" ON private_conversations FOR DELETE USING ((select auth.uid()) = user_id_1 OR (select auth.uid()) = user_id_2);
CREATE POLICY "Users can update their own conversations" ON private_conversations FOR UPDATE USING ((select auth.uid()) = user_id_1 OR (select auth.uid()) = user_id_2);
CREATE POLICY "Users can view their own conversations" ON private_conversations FOR SELECT USING ((select auth.uid()) = user_id_1 OR (select auth.uid()) = user_id_2);

-- ============================================
-- TABLE: private_messages
-- ============================================
DROP POLICY IF EXISTS "Users can delete their own messages" ON private_messages;
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON private_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON private_messages;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON private_messages;

CREATE POLICY "Users can delete their own messages" ON private_messages FOR DELETE USING ((select auth.uid()) = sender_id);
CREATE POLICY "Users can send messages in their conversations" ON private_messages FOR INSERT WITH CHECK (
  (select auth.uid()) = sender_id AND EXISTS (
    SELECT 1 FROM private_conversations c 
    WHERE c.id = private_messages.conversation_id 
    AND (c.user_id_1 = (select auth.uid()) OR c.user_id_2 = (select auth.uid()))
  )
);
CREATE POLICY "Users can update their own messages" ON private_messages FOR UPDATE USING ((select auth.uid()) = sender_id);
CREATE POLICY "Users can view messages in their conversations" ON private_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM private_conversations c 
    WHERE c.id = private_messages.conversation_id 
    AND (c.user_id_1 = (select auth.uid()) OR c.user_id_2 = (select auth.uid()))
  )
);

-- ============================================
-- TABLE: profiles
-- ============================================
DROP POLICY IF EXISTS "Moderators can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

CREATE POLICY "Moderators can view all profiles" ON profiles FOR SELECT USING ((select is_moderator_or_admin()));
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: push_subscriptions
-- ============================================
DROP POLICY IF EXISTS "Users can create their own push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can delete their own push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can view their own push subscriptions" ON push_subscriptions;

CREATE POLICY "Users can create their own push subscriptions" ON push_subscriptions FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete their own push subscriptions" ON push_subscriptions FOR DELETE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can view their own push subscriptions" ON push_subscriptions FOR SELECT USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: referrals
-- ============================================
DROP POLICY IF EXISTS "Users can view their own referrals" ON referrals;

CREATE POLICY "Users can view their own referrals" ON referrals FOR SELECT USING ((select auth.uid()) = referrer_id OR (select auth.uid()) = referred_id);

-- ============================================
-- TABLE: referrals_v2
-- ============================================
DROP POLICY IF EXISTS "Users can create their own referrals v2" ON referrals_v2;
DROP POLICY IF EXISTS "Users can view their own referrals v2" ON referrals_v2;

CREATE POLICY "Users can create their own referrals v2" ON referrals_v2 FOR INSERT WITH CHECK ((select auth.uid()) = inviter_user_id);
CREATE POLICY "Users can view their own referrals v2" ON referrals_v2 FOR SELECT USING ((select auth.uid()) = inviter_user_id OR (select auth.uid()) = invited_user_id);

-- ============================================
-- TABLE: researcher_messages
-- ============================================
DROP POLICY IF EXISTS "Users can create their own messages" ON researcher_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON researcher_messages;
DROP POLICY IF EXISTS "Users can view their own messages" ON researcher_messages;

CREATE POLICY "Users can create their own messages" ON researcher_messages FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete their own messages" ON researcher_messages FOR DELETE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can view their own messages" ON researcher_messages FOR SELECT USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: researcher_usage_daily
-- ============================================
DROP POLICY IF EXISTS "Users can create their own usage" ON researcher_usage_daily;
DROP POLICY IF EXISTS "Users can update their own usage" ON researcher_usage_daily;
DROP POLICY IF EXISTS "Users can view their own usage" ON researcher_usage_daily;

CREATE POLICY "Users can create their own usage" ON researcher_usage_daily FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update their own usage" ON researcher_usage_daily FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can view their own usage" ON researcher_usage_daily FOR SELECT USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: smer_entries
-- ============================================
DROP POLICY IF EXISTS "Users can create their own smer entries" ON smer_entries;
DROP POLICY IF EXISTS "Users can delete their own smer entries" ON smer_entries;
DROP POLICY IF EXISTS "Users can update their own smer entries" ON smer_entries;
DROP POLICY IF EXISTS "Users can view their own smer entries" ON smer_entries;

CREATE POLICY "Users can create their own smer entries" ON smer_entries FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete their own smer entries" ON smer_entries FOR DELETE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can update their own smer entries" ON smer_entries FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can view their own smer entries" ON smer_entries FOR SELECT USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: soul_matches
-- ============================================
DROP POLICY IF EXISTS "Users can view their own matches" ON soul_matches;

CREATE POLICY "Users can view their own matches" ON soul_matches FOR SELECT USING ((select auth.uid()) = user_id_1 OR (select auth.uid()) = user_id_2);

-- ============================================
-- TABLE: soul_profiles
-- ============================================
DROP POLICY IF EXISTS "Users can manage their own soul profile" ON soul_profiles;

CREATE POLICY "Users can manage their own soul profile" ON soul_profiles FOR ALL USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: specialist_bookings
-- ============================================
DROP POLICY IF EXISTS "Users can create their own bookings" ON specialist_bookings;
DROP POLICY IF EXISTS "Users can view their own bookings" ON specialist_bookings;

CREATE POLICY "Users can create their own bookings" ON specialist_bookings FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can view their own bookings" ON specialist_bookings FOR SELECT USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: specialist_slots
-- ============================================
DROP POLICY IF EXISTS "Users can book slots" ON specialist_slots;

CREATE POLICY "Users can book slots" ON specialist_slots FOR UPDATE USING ((select auth.uid()) = booked_by OR booked_by IS NULL);

-- ============================================
-- TABLE: subscriptions
-- ============================================
DROP POLICY IF EXISTS "Admins can insert subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Admins can update subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON subscriptions;

CREATE POLICY "Admins can insert subscriptions" ON subscriptions FOR INSERT WITH CHECK ((select is_admin()));
CREATE POLICY "Admins can update subscriptions" ON subscriptions FOR UPDATE USING ((select is_admin()));
CREATE POLICY "Users can view their own subscriptions" ON subscriptions FOR SELECT USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: system_notifications
-- ============================================
DROP POLICY IF EXISTS "Users can update their own system notifications" ON system_notifications;
DROP POLICY IF EXISTS "Users can view their own system notifications" ON system_notifications;

CREATE POLICY "Users can update their own system notifications" ON system_notifications FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can view their own system notifications" ON system_notifications FOR SELECT USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: usage_counters
-- ============================================
DROP POLICY IF EXISTS "Users can create their own usage counters" ON usage_counters;
DROP POLICY IF EXISTS "Users can update their own usage counters" ON usage_counters;
DROP POLICY IF EXISTS "Users can view their own usage counters" ON usage_counters;

CREATE POLICY "Users can create their own usage counters" ON usage_counters FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update their own usage counters" ON usage_counters FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can view their own usage counters" ON usage_counters FOR SELECT USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: user_art_therapy_entries
-- ============================================
DROP POLICY IF EXISTS "Users can create their own art entries" ON user_art_therapy_entries;
DROP POLICY IF EXISTS "Users can delete their own art entries" ON user_art_therapy_entries;
DROP POLICY IF EXISTS "Users can view their own art entries" ON user_art_therapy_entries;

CREATE POLICY "Users can create their own art entries" ON user_art_therapy_entries FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete their own art entries" ON user_art_therapy_entries FOR DELETE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can view their own art entries" ON user_art_therapy_entries FOR SELECT USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: user_navigator_progress
-- ============================================
DROP POLICY IF EXISTS "Users can create their own progress" ON user_navigator_progress;
DROP POLICY IF EXISTS "Users can update their own progress" ON user_navigator_progress;
DROP POLICY IF EXISTS "Users can view their own progress" ON user_navigator_progress;

CREATE POLICY "Users can create their own progress" ON user_navigator_progress FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update their own progress" ON user_navigator_progress FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can view their own progress" ON user_navigator_progress FOR SELECT USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: user_roles
-- ============================================
DROP POLICY IF EXISTS "Admins can delete user_roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert user_roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update user_roles" ON user_roles;
DROP POLICY IF EXISTS "Mods and admins can read all roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;

CREATE POLICY "Admins can delete user_roles" ON user_roles FOR DELETE USING ((select is_admin()));
CREATE POLICY "Admins can insert user_roles" ON user_roles FOR INSERT WITH CHECK ((select is_admin()));
CREATE POLICY "Admins can update user_roles" ON user_roles FOR UPDATE USING ((select is_admin()));
CREATE POLICY "Mods and admins can read all roles" ON user_roles FOR SELECT USING ((select is_moderator_or_admin()));
CREATE POLICY "Users can view their own roles" ON user_roles FOR SELECT USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: user_usage
-- ============================================
DROP POLICY IF EXISTS "Users can insert their own usage" ON user_usage;
DROP POLICY IF EXISTS "Users can update their own usage" ON user_usage;
DROP POLICY IF EXISTS "Users can view their own usage" ON user_usage;

CREATE POLICY "Users can insert their own usage" ON user_usage FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update their own usage" ON user_usage FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can view their own usage" ON user_usage FOR SELECT USING ((select auth.uid()) = user_id);
