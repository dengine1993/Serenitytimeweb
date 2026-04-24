import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface NotificationPreferences {
  id?: string;
  userId?: string;
  // Push by type
  pushFriendRequests: boolean;
  pushPrivateMessages: boolean;
  pushMentions: boolean;
  pushReactions: boolean;
  pushComments: boolean;
  // Sound & vibration
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  // Quiet hours
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  // Aggregation
  aggregateReactions: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  pushFriendRequests: true,
  pushPrivateMessages: true,
  pushMentions: true,
  pushReactions: false,
  pushComments: false,
  soundEnabled: true,
  vibrationEnabled: true,
  quietHoursEnabled: false,
  quietHoursStart: '23:00',
  quietHoursEnd: '08:00',
  aggregateReactions: true,
};

// Notification type to preference key mapping
const TYPE_TO_PUSH_KEY: Record<string, keyof NotificationPreferences> = {
  friend_request: 'pushFriendRequests',
  friend_accepted: 'pushFriendRequests', // Same as requests
  private_message: 'pushPrivateMessages',
  mention: 'pushMentions',
  reaction: 'pushReactions',
  comment: 'pushComments',
};

// High-priority notification types that always play sound
const HIGH_PRIORITY_TYPES = ['friend_request', 'private_message', 'mention'];

export function useNotificationPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences from DB
  const loadPreferences = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences({
          id: data.id,
          userId: data.user_id,
          pushFriendRequests: data.push_friend_requests ?? true,
          pushPrivateMessages: data.push_private_messages ?? true,
          pushMentions: data.push_mentions ?? true,
          pushReactions: data.push_reactions ?? false,
          pushComments: data.push_comments ?? false,
          soundEnabled: data.sound_enabled ?? true,
          vibrationEnabled: data.vibration_enabled ?? true,
          quietHoursEnabled: data.quiet_hours_enabled ?? false,
          quietHoursStart: data.quiet_hours_start || '23:00',
          quietHoursEnd: data.quiet_hours_end || '08:00',
          aggregateReactions: data.aggregate_reactions ?? true,
        });
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Check if current time is within quiet hours
  const isQuietHoursActive = useCallback((): boolean => {
    if (!preferences.quietHoursEnabled) return false;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = preferences.quietHoursStart.split(':').map(Number);
    const [endHour, endMin] = preferences.quietHoursEnd.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    // Handle overnight quiet hours (e.g., 23:00 - 08:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }, [preferences.quietHoursEnabled, preferences.quietHoursStart, preferences.quietHoursEnd]);

  // Check if sound should play for notification type
  const shouldPlaySound = useCallback((type: string): boolean => {
    if (!preferences.soundEnabled) return false;
    if (isQuietHoursActive()) return false;

    // High-priority notifications always play sound (if enabled)
    if (HIGH_PRIORITY_TYPES.includes(type)) return true;

    // Low-priority (reactions, comments) - check specific setting
    const prefKey = TYPE_TO_PUSH_KEY[type];
    if (prefKey && typeof preferences[prefKey] === 'boolean') {
      return preferences[prefKey] as boolean;
    }

    return true; // Default to playing sound for unknown types
  }, [preferences, isQuietHoursActive]);

  // Check if vibration should trigger
  const shouldVibrate = useCallback((type: string): boolean => {
    if (!preferences.vibrationEnabled) return false;
    if (isQuietHoursActive()) return false;

    // Only vibrate for high-priority
    return HIGH_PRIORITY_TYPES.includes(type);
  }, [preferences.vibrationEnabled, isQuietHoursActive]);

  // Check if push notification should be sent for type
  const shouldSendPush = useCallback((type: string): boolean => {
    const prefKey = TYPE_TO_PUSH_KEY[type];
    if (prefKey && typeof preferences[prefKey] === 'boolean') {
      return preferences[prefKey] as boolean;
    }
    return true; // Default to sending for unknown types
  }, [preferences]);

  // Update a single preference
  const updatePreference = useCallback(async <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    if (!user?.id) return;

    // Optimistic update
    setPreferences(prev => ({ ...prev, [key]: value }));

    // Map camelCase to snake_case for DB
    const dbKeyMap: Record<string, string> = {
      pushFriendRequests: 'push_friend_requests',
      pushPrivateMessages: 'push_private_messages',
      pushMentions: 'push_mentions',
      pushReactions: 'push_reactions',
      pushComments: 'push_comments',
      soundEnabled: 'sound_enabled',
      vibrationEnabled: 'vibration_enabled',
      quietHoursEnabled: 'quiet_hours_enabled',
      quietHoursStart: 'quiet_hours_start',
      quietHoursEnd: 'quiet_hours_end',
      aggregateReactions: 'aggregate_reactions',
    };

    const dbKey = dbKeyMap[key as string];
    if (!dbKey) return;

    try {
      // Upsert preferences
      const { error } = await supabase
        .from('notification_preferences')
        .upsert(
          {
            user_id: user.id,
            [dbKey]: value,
          },
          { onConflict: 'user_id' }
        );

      if (error) throw error;
    } catch (error) {
      console.error('Error updating notification preference:', error);
      // Revert on error
      loadPreferences();
    }
  }, [user?.id, loadPreferences]);

  return {
    preferences,
    isLoading,
    isQuietHoursActive,
    shouldPlaySound,
    shouldVibrate,
    shouldSendPush,
    updatePreference,
    reload: loadPreferences,
  };
}
