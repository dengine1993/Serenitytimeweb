import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface TypingUser {
  user_id: string;
  display_name: string;
}

export function useTypingIndicator() {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const channel = supabase.channel('community-typing');
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: TypingUser[] = [];
        
        Object.values(state).forEach((presences: any[]) => {
          presences.forEach((presence) => {
            if (presence.is_typing && presence.user_id !== user?.id) {
              users.push({
                user_id: presence.user_id,
                display_name: presence.display_name || 'Аноним'
              });
            }
          });
        });
        
        setTypingUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && user) {
          await channel.track({
            user_id: user.id,
            display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Аноним',
            is_typing: false
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const startTyping = useCallback(async () => {
    if (!user || !channelRef.current) return;

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Update presence to typing
    await channelRef.current.track({
      user_id: user.id,
      display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Аноним',
      is_typing: true
    });

    // Auto-stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(async () => {
      await stopTyping();
    }, 3000);
  }, [user]);

  const stopTyping = useCallback(async () => {
    if (!user || !channelRef.current) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    await channelRef.current.track({
      user_id: user.id,
      display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Аноним',
      is_typing: false
    });
  }, [user]);

  return {
    typingUsers,
    startTyping,
    stopTyping
  };
}
