import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  accepted_at: string | null;
  friend_profile?: {
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
}

export interface FriendRequest {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
  sender?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
}

// Profile cache
const profileCache = new Map<string, {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
}>();

export interface BlockedUser {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: string;
  blocked_profile?: {
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
}

export function useFriends() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchProfiles = async (userIds: string[]) => {
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

  const loadFriends = useCallback(async () => {
    if (!user) return;

    // Load accepted friendships where I'm either user_id or friend_id
    const { data: friendships } = await supabase
      .from('friendships')
      .select('*')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .eq('status', 'accepted');

    if (!friendships || friendships.length === 0) {
      setFriends([]);
    } else {
      // Get friend user IDs
      const friendUserIds = friendships.map(f => 
        f.user_id === user.id ? f.friend_id : f.user_id
      );
      await fetchProfiles(friendUserIds);

      setFriends(friendships.map(f => {
        const friendId = f.user_id === user.id ? f.friend_id : f.user_id;
        return {
          ...f,
          friend_profile: profileCache.get(friendId)
        };
      }) as Friend[]);
    }
  }, [user]);

  const loadIncomingRequests = useCallback(async () => {
    if (!user) return;

    // Requests where I'm the friend_id (receiver)
    const { data: requests } = await supabase
      .from('friendships')
      .select('*')
      .eq('friend_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (!requests || requests.length === 0) {
      setIncomingRequests([]);
      return;
    }

    // Fetch sender profiles
    const senderIds = requests.map(r => r.user_id);
    await fetchProfiles(senderIds);

    setIncomingRequests(
      requests.map(r => ({
        ...r,
        sender: profileCache.get(r.user_id)
      }))
    );
  }, [user]);

  const loadOutgoingRequests = useCallback(async () => {
    if (!user) return;

    // Requests where I'm the user_id (sender)
    const { data: requests } = await supabase
      .from('friendships')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending');

    setOutgoingRequests(requests || []);
  }, [user]);

  const loadBlockedUsers = useCallback(async () => {
    if (!user) return;

    const { data: blocked } = await supabase
      .from('friendships')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'blocked');

    if (!blocked || blocked.length === 0) {
      setBlockedUsers([]);
      return;
    }

    const blockedIds = blocked.map(b => b.friend_id);
    await fetchProfiles(blockedIds);

    setBlockedUsers(
      blocked.map(b => ({
        ...b,
        blocked_profile: profileCache.get(b.friend_id)
      }))
    );
  }, [user]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await Promise.all([loadFriends(), loadIncomingRequests(), loadOutgoingRequests(), loadBlockedUsers()]);
      setIsLoading(false);
    };

    if (user) {
      load();
    }

    // Subscribe to updates
    if (user) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      channelRef.current = supabase
        .channel('friendships-updates')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'friendships'
        }, () => {
          loadFriends();
          loadIncomingRequests();
          loadOutgoingRequests();
          loadBlockedUsers();
        })
        .subscribe();

      return () => {
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      };
    }
  }, [user, loadFriends, loadIncomingRequests, loadOutgoingRequests, loadBlockedUsers]);

  const sendFriendRequest = async (friendId: string): Promise<{ success?: boolean; error?: string; alreadyFriends?: boolean; alreadySent?: boolean; blocked?: boolean; privacyBlocked?: boolean }> => {
    if (!user) return { error: 'Not authenticated' };

    // Check receiver's privacy settings for friend requests
    const { data: receiverProfile } = await supabase
      .from('profiles')
      .select('allow_friend_requests')
      .eq('user_id', friendId)
      .single();

    if (receiverProfile?.allow_friend_requests === 'nobody') {
      return { privacyBlocked: true };
    }

    // Check if already friends or blocked
    const { data: existing } = await supabase
      .from('friendships')
      .select('id, status')
      .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'accepted') {
        return { alreadyFriends: true };
      }
      if (existing.status === 'pending') {
        return { alreadySent: true };
      }
      if (existing.status === 'blocked') {
        return { blocked: true };
      }
    }

    const { error } = await supabase
      .from('friendships')
      .insert({
        user_id: user.id,
        friend_id: friendId,
        status: 'pending'
      });

    if (error) {
      return { error: error.message };
    }

    // Create notification for the recipient
    await supabase.from('notifications').insert({
      user_id: friendId,
      type: 'friend_request',
      title: 'Запрос в друзья',
      actor_id: user.id,
      action_url: '/settings?tab=friends',
      metadata: {}
    });

    await loadOutgoingRequests();
    return { success: true };
  };

  const acceptRequest = async (requestId: string) => {
    if (!user) return;

    // Get the request to find the sender
    const request = incomingRequests.find(r => r.id === requestId);

    await supabase
      .from('friendships')
      .update({ 
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .eq('friend_id', user.id);

    // Create notification for the sender that their request was accepted
    if (request?.user_id) {
      await supabase.from('notifications').insert({
        user_id: request.user_id,
        type: 'friend_accepted',
        title: 'Запрос принят',
        actor_id: user.id,
        action_url: '/settings?tab=friends',
        metadata: {}
      });
    }

    await Promise.all([loadFriends(), loadIncomingRequests()]);
  };

  const declineRequest = async (requestId: string) => {
    if (!user) return;

    await supabase
      .from('friendships')
      .delete()
      .eq('id', requestId)
      .eq('friend_id', user.id);

    await loadIncomingRequests();
  };

  const cancelRequest = async (requestId: string) => {
    if (!user) return;

    await supabase
      .from('friendships')
      .delete()
      .eq('id', requestId)
      .eq('user_id', user.id);

    await loadOutgoingRequests();
  };

  const removeFriend = async (friendshipId: string) => {
    if (!user) return;

    await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    await loadFriends();
  };

  const isFriend = useCallback((userId: string): boolean => {
    return friends.some(f => 
      f.user_id === userId || f.friend_id === userId
    );
  }, [friends]);

  const hasPendingRequest = useCallback((userId: string): 'incoming' | 'outgoing' | null => {
    const incoming = incomingRequests.find(r => r.user_id === userId);
    if (incoming) return 'incoming';
    
    const outgoing = outgoingRequests.find(r => r.friend_id === userId);
    if (outgoing) return 'outgoing';
    
    return null;
  }, [incomingRequests, outgoingRequests]);

  const getFriendship = useCallback((userId: string) => {
    return friends.find(f => f.user_id === userId || f.friend_id === userId);
  }, [friends]);

  const getIncomingRequest = useCallback((senderId: string) => {
    return incomingRequests.find(r => r.user_id === senderId);
  }, [incomingRequests]);

  const isBlocked = useCallback((userId: string): boolean => {
    return blockedUsers.some(b => b.friend_id === userId);
  }, [blockedUsers]);

  const blockUser = async (userId: string): Promise<{ success?: boolean; error?: string }> => {
    if (!user) return { error: 'Not authenticated' };

    // First, remove any existing friendship
    await supabase
      .from('friendships')
      .delete()
      .or(`and(user_id.eq.${user.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${user.id})`);

    // Create blocked entry
    const { error } = await supabase
      .from('friendships')
      .insert({
        user_id: user.id,
        friend_id: userId,
        status: 'blocked'
      });

    if (error) {
      return { error: error.message };
    }

    await loadBlockedUsers();
    await loadFriends();
    return { success: true };
  };

  const unblockUser = async (userId: string): Promise<{ success?: boolean; error?: string }> => {
    if (!user) return { error: 'Not authenticated' };

    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('user_id', user.id)
      .eq('friend_id', userId)
      .eq('status', 'blocked');

    if (error) {
      return { error: error.message };
    }

    await loadBlockedUsers();
    return { success: true };
  };

  return {
    friends,
    incomingRequests,
    outgoingRequests,
    blockedUsers,
    isLoading,
    sendFriendRequest,
    acceptRequest,
    declineRequest,
    cancelRequest,
    removeFriend,
    isFriend,
    hasPendingRequest,
    getFriendship,
    getIncomingRequest,
    isBlocked,
    blockUser,
    unblockUser,
    refresh: () => Promise.all([loadFriends(), loadIncomingRequests(), loadOutgoingRequests(), loadBlockedUsers()])
  };
}
