import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface PrivateMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  media_url?: string | null;
  media_type?: string | null;
  read_at?: string | null;
  created_at: string;
}

export function usePrivateMessages(conversationId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    // @ts-ignore
    const { data } = await supabase
      .from('private_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    setMessages(data || []);
    setIsLoading(false);
  }, [conversationId]);

  useEffect(() => {
    if (conversationId) {
      loadMessages();

      // Single combined channel for messages and presence
      const channel = supabase
        .channel(`private-chat-${conversationId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages',
          filter: `conversation_id=eq.${conversationId}`
        }, (payload) => {
          const newMsg = payload.new as PrivateMessage;
          setMessages(prev => [...prev, newMsg]);
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'private_messages',
          filter: `conversation_id=eq.${conversationId}`
        }, (payload) => {
          const updatedMsg = payload.new as PrivateMessage;
          setMessages(prev => prev.map(m => 
            m.id === updatedMsg.id ? updatedMsg : m
          ));
        })
        // Presence for typing indicator - combined in same channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const others = Object.values(state).flat().filter(
            (p: any) => p.user_id !== user?.id && p.is_typing
          );
          setOtherUserTyping(others.length > 0);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED' && user) {
            await channel.track({ 
              user_id: user.id, 
              is_typing: false 
            });
          }
        });

      channelRef.current = channel;

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [conversationId, user, loadMessages]);

  const sendMessage = async (content: string, mediaUrl?: string, mediaType?: string) => {
    if (!user || !conversationId || (!content.trim() && !mediaUrl)) return;

    stopTyping();

    // @ts-ignore
    const { error, data } = await supabase
      .from('private_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
        media_url: mediaUrl || null,
        media_type: mediaType || null
      })
      .select()
      .single();

    if (!error && data) {
      // Optimistic update already handled by realtime
    }

    return { error, data };
  };

  const markAsRead = async (messageId: string) => {
    if (!user) return;

    // @ts-ignore
    await supabase
      .from('private_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', messageId)
      .neq('sender_id', user.id)
      .is('read_at', null);
  };

  const markAllAsRead = async () => {
    if (!user || !conversationId) return;

    // @ts-ignore
    await supabase
      .from('private_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id)
      .is('read_at', null);
  };

  const startTyping = useCallback(() => {
    if (channelRef.current && user) {
      channelRef.current.track({ user_id: user.id, is_typing: true });
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, 3000);
    }
  }, [user]);

  const stopTyping = useCallback(() => {
    if (channelRef.current && user) {
      channelRef.current.track({ user_id: user.id, is_typing: false });
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, [user]);

  return {
    messages,
    isLoading,
    otherUserTyping,
    sendMessage,
    markAsRead,
    markAllAsRead,
    startTyping,
    stopTyping
  };
}
