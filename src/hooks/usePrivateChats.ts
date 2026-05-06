import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface PrivateConversation {
  id: string;
  user_id_1: string;
  user_id_2: string;
  status: string;
  created_at: string;
  updated_at: string;
  other_user?: {
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
  unread_count?: number;
}

export interface ChatRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  sender?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

const profileCache = new Map<string, {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
}>();

export function usePrivateChats() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<PrivateConversation[]>([]);
  const [pendingRequests, setPendingRequests] = useState<ChatRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchProfiles = async (userIds: string[]) => {
    const uncachedIds = userIds.filter(id => !profileCache.has(id));

    if (uncachedIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, username')
        .in('user_id', uncachedIds);

      profiles?.forEach((p: any) => profileCache.set(p.user_id, p));
    }

    return userIds.map(id => profileCache.get(id)).filter(Boolean);
  };

  const loadConversations = useCallback(async () => {
    if (!user) return;

    // @ts-ignore - rpc not in generated types yet
    const { data: rows, error } = await supabase.rpc('get_conversations_with_last_message', {
      p_user_id: user.id,
    });

    if (error || !rows || rows.length === 0) {
      setConversations([]);
      return;
    }

    const otherUserIds = rows.map((r: any) =>
      r.user_id_1 === user.id ? r.user_id_2 : r.user_id_1
    );
    await fetchProfiles(otherUserIds);

    const conversationsWithDetails: PrivateConversation[] = rows.map((r: any) => {
      const otherId = r.user_id_1 === user.id ? r.user_id_2 : r.user_id_1;
      return {
        id: r.conversation_id,
        user_id_1: r.user_id_1,
        user_id_2: r.user_id_2,
        status: r.status,
        created_at: r.conv_created_at,
        updated_at: r.conv_updated_at,
        other_user: profileCache.get(otherId),
        last_message: r.last_content
          ? {
              content: r.last_content,
              created_at: r.last_created_at,
              sender_id: r.last_sender_id,
            }
          : undefined,
        unread_count: Number(r.unread_count) || 0,
      };
    });

    setConversations(conversationsWithDetails);
  }, [user]);

  const loadPendingRequests = useCallback(async () => {
    if (!user) return;

    const { data: requests } = await supabase
      .from('private_chat_requests')
      .select('*')
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (!requests || requests.length === 0) {
      setPendingRequests([]);
      return;
    }

    const senderIds = requests.map((r: any) => r.sender_id);
    await fetchProfiles(senderIds);

    setPendingRequests(
      requests.map((r: any) => ({
        ...r,
        sender: profileCache.get(r.sender_id)
      }))
    );
  }, [user]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await Promise.all([loadConversations(), loadPendingRequests()]);
      setIsLoading(false);
    };

    if (user) {
      load();
    }

    if (user) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      channelRef.current = supabase
        .channel('private-chats-combined')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'private_messages'
        }, () => {
          loadConversations();
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'private_chat_requests',
          filter: `receiver_id=eq.${user.id}`
        }, () => {
          loadPendingRequests();
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'private_conversations'
        }, () => {
          loadConversations();
        })
        .subscribe();

      return () => {
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      };
    }
  }, [user, loadConversations, loadPendingRequests]);

  const startConversation = async (
    receiverId: string,
  ): Promise<{
    conversationId?: string;
    error?: string;
    needsFriend?: boolean;
    blocked?: boolean;
  }> => {
    if (!user) return { error: 'Not authenticated' };

    const { data: blockedByReceiver } = await supabase
      .from('friendships')
      .select('id')
      .eq('user_id', receiverId)
      .eq('friend_id', user.id)
      .eq('status', 'blocked')
      .maybeSingle();

    if (blockedByReceiver) {
      return { error: 'Пользователь ограничил общение' };
    }

    const { data: blockedByMe } = await supabase
      .from('friendships')
      .select('id')
      .eq('user_id', user.id)
      .eq('friend_id', receiverId)
      .eq('status', 'blocked')
      .maybeSingle();

    if (blockedByMe) {
      return { error: 'Вы заблокировали этого пользователя' };
    }

    const { data: existing } = await supabase
      .from('private_conversations')
      .select('id')
      .or(`and(user_id_1.eq.${user.id},user_id_2.eq.${receiverId}),and(user_id_1.eq.${receiverId},user_id_2.eq.${user.id})`)
      .maybeSingle();

    if (existing) {
      return { conversationId: existing.id };
    }

    const { data: receiverProfile } = await supabase
      .from('profiles')
      .select('allow_private_messages')
      .eq('user_id', receiverId)
      .single();

    const privacySetting = receiverProfile?.allow_private_messages || 'all';

    if (privacySetting === 'nobody') {
      return { blocked: true };
    }

    if (privacySetting === 'friends') {
      const { data: friendship } = await supabase
        .from('friendships')
        .select('id, status')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${receiverId}),and(user_id.eq.${receiverId},friend_id.eq.${user.id})`)
        .eq('status', 'accepted')
        .maybeSingle();

      if (!friendship) {
        return { needsFriend: true };
      }
    }

    const { data: conv, error } = await supabase
      .from('private_conversations')
      .insert({
        user_id_1: user.id,
        user_id_2: receiverId,
      })
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    await loadConversations();
    return { conversationId: conv.id };
  };

  const sendChatRequest = startConversation;

  const acceptRequest = async (requestId: string, senderId: string) => {
    if (!user) return;

    await supabase
      .from('private_chat_requests')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', requestId);

    const { data: conv } = await supabase
      .from('private_conversations')
      .insert({
        user_id_1: senderId,
        user_id_2: user.id
      })
      .select()
      .single();

    await loadConversations();
    await loadPendingRequests();

    return conv?.id;
  };

  const declineRequest = async (requestId: string) => {
    await supabase
      .from('private_chat_requests')
      .update({ status: 'declined', responded_at: new Date().toISOString() })
      .eq('id', requestId);

    await loadPendingRequests();
  };

  const deleteConversation = async (conversationId: string) => {
    await supabase
      .from('private_conversations')
      .update({ status: 'deleted' })
      .eq('id', conversationId);

    await loadConversations();
  };

  return {
    conversations,
    pendingRequests,
    isLoading,
    sendChatRequest,
    startConversation,
    acceptRequest,
    declineRequest,
    deleteConversation,
    refresh: loadConversations
  };
}
