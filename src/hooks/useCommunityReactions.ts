import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction_type: string;
}

export function useCommunityReactions(messageId: string) {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const userIdRef = useRef(user?.id);
  
  // Keep ref updated
  useEffect(() => {
    userIdRef.current = user?.id;
  }, [user?.id]);

  // Load reactions for this message
  useEffect(() => {
    const loadReactions = async () => {
      const { data } = await supabase
        .from('message_reactions')
        .select('*')
        .eq('message_id', messageId);
      
      if (data) {
        setReactions(data);
      }
      setIsLoading(false);
    };

    loadReactions();

    // Subscribe to reaction changes
    const channel = supabase
      .channel(`reactions-${messageId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'message_reactions',
        filter: `message_id=eq.${messageId}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newReaction = payload.new as Reaction;
          setReactions(prev => {
            // If we already have a temp reaction from this user+type, replace it
            const hasExisting = prev.some(r => 
              r.user_id === newReaction.user_id && 
              r.reaction_type === newReaction.reaction_type
            );
            
            if (hasExisting) {
              return prev.map(r => 
                (r.user_id === newReaction.user_id && r.reaction_type === newReaction.reaction_type)
                  ? newReaction
                  : r
              );
            }
            return [...prev, newReaction];
          });
        } else if (payload.eventType === 'DELETE') {
          const oldReaction = payload.old as Reaction;
          setReactions(prev => prev.filter(r => 
            r.id !== oldReaction.id && 
            !(r.id.startsWith('temp-') && r.user_id === oldReaction.user_id && r.reaction_type === oldReaction.reaction_type)
          ));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId]);

  const toggleReaction = useCallback(async (reactionType: string = 'like') => {
    const currentUserId = userIdRef.current;
    if (!currentUserId) return;
    
    // Use functional update to check current state and decide action
    let shouldAdd = true;
    
    setReactions(prev => {
      const existingReaction = prev.find(
        r => r.user_id === currentUserId && r.reaction_type === reactionType
      );
      
      if (existingReaction) {
        // Remove reaction optimistically
        shouldAdd = false;
        return prev.filter(r => 
          !(r.user_id === currentUserId && r.reaction_type === reactionType)
        );
      } else {
        // Add reaction optimistically
        const tempId = `temp-${Date.now()}`;
        return [...prev, {
          id: tempId,
          message_id: messageId,
          user_id: currentUserId,
          reaction_type: reactionType
        }];
      }
    });
    
    // Perform async operation after optimistic update
    if (shouldAdd) {
      const { data } = await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: currentUserId,
          reaction_type: reactionType
        })
        .select()
        .single();
      
      // Replace temp with real ID
      if (data) {
        setReactions(prev => prev.map(r => 
          (r.user_id === currentUserId && r.reaction_type === reactionType && r.id.startsWith('temp-'))
            ? data
            : r
        ));
      }
    } else {
      await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', currentUserId)
        .eq('reaction_type', reactionType);
    }
  }, [messageId]);

  const hasReacted = useCallback((reactionType: string = 'like') => {
    if (!user) return false;
    return reactions.some(r => r.user_id === user.id && r.reaction_type === reactionType);
  }, [user, reactions]);

  const getReactionCount = useCallback((reactionType: string = 'like') => {
    return reactions.filter(r => r.reaction_type === reactionType).length;
  }, [reactions]);

  // Total likes count helper
  const totalLikes = reactions.filter(r => r.reaction_type === 'like').length;

  return {
    reactions,
    isLoading,
    toggleReaction,
    hasReacted,
    getReactionCount,
    totalLikes
  };
}
