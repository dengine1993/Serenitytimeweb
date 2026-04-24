import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type ReactionType = 'heart' | 'hug' | 'strength';

export const REACTION_EMOJIS: Record<ReactionType, string> = {
  heart: '❤️',
  hug: '🤗',
  strength: '💪'
};

interface ReactionCounts {
  heart: number;
  hug: number;
  strength: number;
}

interface UserReactions {
  heart: boolean;
  hug: boolean;
  strength: boolean;
}

interface UseStoryReactionsResult {
  counts: ReactionCounts;
  userReactions: UserReactions;
  toggleReaction: (type: ReactionType) => Promise<void>;
  isLoading: boolean;
}

export function useStoryReactions(storyId: string): UseStoryReactionsResult {
  const { user } = useAuth();
  const [counts, setCounts] = useState<ReactionCounts>({ heart: 0, hug: 0, strength: 0 });
  const [userReactions, setUserReactions] = useState<UserReactions>({ heart: false, hug: false, strength: false });
  const [isLoading, setIsLoading] = useState(false);

  // Fetch reactions
  useEffect(() => {
    if (!storyId) return;

    const fetchReactions = async () => {
      const { data: allReactions } = await supabase
        .from('story_reactions')
        .select('reaction_type, user_id')
        .eq('story_id', storyId);

      if (allReactions) {
        const newCounts: ReactionCounts = { heart: 0, hug: 0, strength: 0 };
        const newUserReactions: UserReactions = { heart: false, hug: false, strength: false };

        allReactions.forEach(r => {
          const type = r.reaction_type as ReactionType;
          newCounts[type]++;
          if (user && r.user_id === user.id) {
            newUserReactions[type] = true;
          }
        });

        setCounts(newCounts);
        setUserReactions(newUserReactions);
      }
    };

    fetchReactions();

    // Realtime subscription
    const channel = supabase
      .channel(`story-reactions-${storyId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'story_reactions',
        filter: `story_id=eq.${storyId}`
      }, () => {
        fetchReactions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storyId, user]);

  const toggleReaction = useCallback(async (type: ReactionType) => {
    if (!user || isLoading) return;
    setIsLoading(true);

    try {
      if (userReactions[type]) {
        // Remove reaction
        await supabase
          .from('story_reactions')
          .delete()
          .eq('story_id', storyId)
          .eq('user_id', user.id)
          .eq('reaction_type', type);

        setUserReactions(prev => ({ ...prev, [type]: false }));
        setCounts(prev => ({ ...prev, [type]: Math.max(0, prev[type] - 1) }));
      } else {
        // Add reaction
        await supabase
          .from('story_reactions')
          .insert({ story_id: storyId, user_id: user.id, reaction_type: type });

        setUserReactions(prev => ({ ...prev, [type]: true }));
        setCounts(prev => ({ ...prev, [type]: prev[type] + 1 }));
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, storyId, userReactions, isLoading]);

  return { counts, userReactions, toggleReaction, isLoading };
}

// Hook for comment reactions
interface UseCommentReactionsResult {
  counts: ReactionCounts;
  userReactions: UserReactions;
  toggleReaction: (type: ReactionType) => Promise<void>;
  isLoading: boolean;
}

export function useCommentReactions(commentId: string): UseCommentReactionsResult {
  const { user } = useAuth();
  const [counts, setCounts] = useState<ReactionCounts>({ heart: 0, hug: 0, strength: 0 });
  const [userReactions, setUserReactions] = useState<UserReactions>({ heart: false, hug: false, strength: false });
  const [isLoading, setIsLoading] = useState(false);

  // Fetch reactions
  useEffect(() => {
    if (!commentId) return;

    const fetchReactions = async () => {
      const { data: allReactions } = await supabase
        .from('story_comment_reactions')
        .select('reaction_type, user_id')
        .eq('comment_id', commentId);

      if (allReactions) {
        const newCounts: ReactionCounts = { heart: 0, hug: 0, strength: 0 };
        const newUserReactions: UserReactions = { heart: false, hug: false, strength: false };

        allReactions.forEach(r => {
          const type = r.reaction_type as ReactionType;
          newCounts[type]++;
          if (user && r.user_id === user.id) {
            newUserReactions[type] = true;
          }
        });

        setCounts(newCounts);
        setUserReactions(newUserReactions);
      }
    };

    fetchReactions();
  }, [commentId, user]);

  const toggleReaction = useCallback(async (type: ReactionType) => {
    if (!user || isLoading) return;
    setIsLoading(true);

    try {
      if (userReactions[type]) {
        // Remove reaction
        await supabase
          .from('story_comment_reactions')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id)
          .eq('reaction_type', type);

        setUserReactions(prev => ({ ...prev, [type]: false }));
        setCounts(prev => ({ ...prev, [type]: Math.max(0, prev[type] - 1) }));
      } else {
        // Add reaction
        await supabase
          .from('story_comment_reactions')
          .insert({ comment_id: commentId, user_id: user.id, reaction_type: type });

        setUserReactions(prev => ({ ...prev, [type]: true }));
        setCounts(prev => ({ ...prev, [type]: prev[type] + 1 }));
      }
    } catch (error) {
      console.error('Error toggling comment reaction:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, commentId, userReactions, isLoading]);

  return { counts, userReactions, toggleReaction, isLoading };
}
