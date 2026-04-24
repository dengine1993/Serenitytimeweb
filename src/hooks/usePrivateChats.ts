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

// Cache for profiles to avoid repeated fetches
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
    // Filter out already cached profiles
    const uncachedIds = userIds.filter(id => !profileCache.has(id));
    
    if (uncachedIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, username')
        .in('user_id', uncachedIds);
      
      profiles?.forEach(p => profileCache.set(p.user_id, p));
    }
    
    return userIds.map(id => profileCache.get(id)).filter(Boolean);
  };

  const loadConversations = useCallback(async () => {
    if (!user) return;

    // @ts-ignore - avoiding deep type instantiation
    const { data: convos } = await supabase
      .from('private_conversations')
      .select('*')
      .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`)
      .eq('status', 'active')
      .order('updated_at', { ascending: false });

    if (!convos || convos.length === 0) {
      setConversations([]);
      return;
    }

    // Get other user IDs and fetch profiles (with caching)
    const otherUserIds = convos.map(c => 
      c.user_id_1 === user.id ? c.user_id_2 : c.user_id_1
    );
    await fetchProfiles(otherUserIds);

    // Fetch all last messages in a single query using conversation IDs
    const convIds = convos.map(c => c.id);
    
    // Get all messages for all conversations, ordered by created_at desc
    // @ts-ignore
    const { data: allMessages } = await supabase
      .from('private_messages')
      .select('conversation_id, content, created_at, sender_id, read_at')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false });

    // Group by conversation_id and get the latest message and unread count
    const lastMessageMap = new Map<string, { content: string; created_at: string; sender_id: string }>();
    const unreadCountMap = new Map<string, number>();
    
    if (allMessages) {
      allMessages.forEach(msg => {
        // Set last message (first occurrence is the latest due to ordering)
        if (!lastMessageMap.has(msg.conversation_id)) {
          lastMessageMap.set(msg.conversation_id, {
            content: msg.content,
            created_at: msg.created_at,
            sender_id: msg.sender_id
          });
        }
        
        // Count unread messages (not from current user and not read)
        if (msg.sender_id !== user.id && !msg.read_at) {
          unreadCountMap.set(msg.conversation_id, (unreadCountMap.get(msg.conversation_id) || 0) + 1);
        }
      });
    }

    const conversationsWithDetails = convos.map(conv => {
      const otherId = conv.user_id_1 === user.id ? conv.user_id_2 : conv.user_id_1;
      return {
        ...conv,
        other_user: profileCache.get(otherId),
        last_message: lastMessageMap.get(conv.id),
        unread_count: unreadCountMap.get(conv.id) || 0
      };
    });

    setConversations(conversationsWithDetails);
  }, [user]);

  const loadPendingRequests = useCallback(async () => {
    if (!user) return;

    // @ts-ignore
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

    // Fetch sender profiles (with caching)
    const senderIds = requests.map(r => r.sender_id);
    await fetchProfiles(senderIds);

    setPendingRequests(
      requests.map(r => ({
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

    // Subscribe to updates using a single combined channel
    if (user) {
      // Clean up existing channel
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

  const startConversation = async (receiverId: string): Promise<{ 
    conversationId?: string; 
    error?: string; 
    needsFriend?: boolean;
    blocked?: boolean;
  }> => {
    if (!user) return { error: 'Not authenticated' };

    // Check if blocked by receiver
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

    // Check if I blocked receiver
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

    // Check if conversation already exists
    // @ts-ignore
    const { data: existing } = await supabase
      .from('private_conversations')
      .select('id')
      .or(`and(user_id_1.eq.${user.id},user_id_2.eq.${receiverId}),and(user_id_1.eq.${receiverId},user_id_2.eq.${user.id})`)
      .maybeSingle();

    if (existing) {
      return { conversationId: existing.id };
    }

    // Check receiver's privacy settings
    const { data: receiverProfile } = await supabase
      .from('profiles')
      .select('allow_private_messages')
      .eq('user_id', receiverId)
      .single();

    const privacySetting = receiverProfile?.allow_private_messages || 'all';

    // Check if blocked
    if (privacySetting === 'nobody') {
      return { blocked: true };
    }

    // Check friendship if required
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

    // Create conversation directly (no request/approval needed)
    // @ts-ignore
    const { data: conv, error } = await supabase
      .from('private_conversations')
      .insert({
        user_id_1: user.id,
        user_id_2: receiverId
      })
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    await loadConversations();
    return { conversationId: conv.id };
  };

  // Legacy function for backwards compatibility
  const sendChatRequest = startConversation;

  const acceptRequest = async (requestId: string, senderId: string) => {
    if (!user) return;

    // Update request status
    // @ts-ignore
    await supabase
      .from('private_chat_requests')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', requestId);

    // Create conversation
    // @ts-ignore
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
    // @ts-ignore
    await supabase
      .from('private_chat_requests')
      .update({ status: 'declined', responded_at: new Date().toISOString() })
      .eq('id', requestId);

    await loadPendingRequests();
  };

  const deleteConversation = async (conversationId: string) => {
    // @ts-ignore
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
