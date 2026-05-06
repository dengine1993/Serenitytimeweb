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
  edited_at?: string | null;
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

    const { data } = await supabase
      .from('private_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    setMessages((data as PrivateMessage[]) || []);
    setIsLoading(false);
  }, [conversationId]);

  useEffect(() => {
    if (conversationId) {
      loadMessages();

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
        .on('postgres_changes', {
          event: 'DELETE',
          schema: 'public',
          table: 'private_messages',
          filter: `conversation_id=eq.${conversationId}`
        }, (payload) => {
          const oldMsg = payload.old as { id: string };
          setMessages(prev => prev.filter(m => m.id !== oldMsg.id));
        })
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

  const sendMessage = async (
    content: string,
    mediaUrl?: string,
    mediaType?: string,
  ) => {
    if (!user || !conversationId || (!content.trim() && !mediaUrl)) return;

    stopTyping();

    const { error, data } = await supabase
      .from('private_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
        media_url: mediaUrl || null,
        media_type: mediaType || null,
      })
      .select()
      .single();

    // Fire-and-forget push notification to recipient
    if (!error && data) {
      try {
        const { data: conv } = await supabase
          .from('private_conversations')
          .select('user_id_1, user_id_2')
          .eq('id', conversationId)
          .maybeSingle();
        const recipient = conv && (conv.user_id_1 === user.id ? conv.user_id_2 : conv.user_id_1);
        if (recipient) {
          supabase.functions.invoke('notify-event', {
            body: {
              type: 'dm',
              recipient_id: recipient,
              preview: content.trim() || (mediaUrl ? '📎 Вложение' : ''),
              conversation_id: conversationId,
            },
          }).catch(() => undefined);
        }
      } catch { /* ignore */ }
    }

    return { error, data };
  };

  const markAsRead = async (messageId: string) => {
    if (!user) return;

    await supabase
      .from('private_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', messageId)
      .neq('sender_id', user.id)
      .is('read_at', null);
  };

  const markAllAsRead = async () => {
    if (!user || !conversationId) return;

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

  const editMessage = async (messageId: string, newContent: string) => {
    if (!user) return { error: 'Not authenticated' };
    const trimmed = newContent.trim();
    if (!trimmed) return { error: 'Empty' };
    const { error } = await supabase
      .from('private_messages')
      .update({ content: trimmed })
      .eq('id', messageId)
      .eq('sender_id', user.id);
    if (error) return { error: error.message };
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: trimmed, edited_at: new Date().toISOString() } : m));
    return { error: null };
  };

  const deleteMessage = async (messageId: string) => {
    if (!user) return { error: 'Not authenticated' };
    const { error } = await supabase
      .from('private_messages')
      .delete()
      .eq('id', messageId)
      .eq('sender_id', user.id);
    if (error) return { error: error.message };
    setMessages(prev => prev.filter(m => m.id !== messageId));
    return { error: null };
  };

  return {
    messages,
    isLoading,
    otherUserTyping,
    sendMessage,
    editMessage,
    deleteMessage,
    markAsRead,
    markAllAsRead,
    startTyping,
    stopTyping
  };
}
