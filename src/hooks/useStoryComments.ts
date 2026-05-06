import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface StoryComment {
  id: string;
  story_id: string;
  user_id: string;
  content: string;
  reply_to_id: string | null;
  created_at: string;
  edited_at?: string | null;
  author?: {
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  is_premium?: boolean;
}

export function useStoryComments(storyId: string | null) {
  const { user } = useAuth();
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadComments = useCallback(async () => {
    if (!storyId) {
      setComments([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const { data: commentsData, error } = await supabase
        .from('story_comments')
        .select('*')
        .eq('story_id', storyId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading comments:', error);
        return;
      }

      if (commentsData) {
        const userIds = [...new Set(commentsData.map(c => c.user_id))];

        let profileMap = new Map<string, StoryComment['author']>();
        let premiumUserIds = new Set<string>();

        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, display_name, avatar_url')
            .in('user_id', userIds);

          const { data: premiumIds } = await supabase
            .rpc('get_premium_user_ids', { user_ids: userIds });

          profileMap = new Map(profiles?.map(p => [p.user_id, p as StoryComment['author']]) || []);
          premiumUserIds = new Set(premiumIds || []);
        }

        const processedComments: StoryComment[] = commentsData.map(comment => ({
          ...comment,
          author: profileMap.get(comment.user_id),
          is_premium: premiumUserIds.has(comment.user_id)
        }));

        setComments(processedComments);
      }
    } finally {
      setIsLoading(false);
    }
  }, [storyId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  useEffect(() => {
    if (!storyId) return;

    const channel = supabase
      .channel(`story-comments-${storyId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'story_comments',
        filter: `story_id=eq.${storyId}`
      }, async (payload) => {
        const newComment = payload.new as any;

        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .eq('user_id', newComment.user_id)
          .maybeSingle();

        const { data: premiumIds } = await supabase
          .rpc('get_premium_user_ids', { user_ids: [newComment.user_id] });

        const author = (profile as StoryComment['author']) || undefined;
        const is_premium = premiumIds?.includes(newComment.user_id) || false;

        setComments(prev => [...prev, {
          ...newComment,
          author,
          is_premium,
        }]);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'story_comments',
        filter: `story_id=eq.${storyId}`
      }, (payload) => {
        const u = payload.new as any;
        setComments(prev => prev.map(c => c.id === u.id ? { ...c, content: u.content, edited_at: u.edited_at } : c));
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'story_comments',
        filter: `story_id=eq.${storyId}`
      }, (payload) => {
        const deleted = payload.old as any;
        setComments(prev => prev.filter(c => c.id !== deleted.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storyId]);

  const sendComment = async (content: string, replyToId?: string) => {
    if (!user || !storyId) return { error: 'Not authenticated' };

    if (!content.trim()) {
      return { error: 'Comment cannot be empty' };
    }

    if (content.trim().length > 1000) {
      return { error: 'Comment too long (max 1000 characters)' };
    }

    const { data, error } = await supabase
      .from('story_comments')
      .insert({
        story_id: storyId,
        user_id: user.id,
        content: content.trim(),
        reply_to_id: replyToId || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending comment:', error);
      return { error: error.message };
    }

    return { data };
  };

  const deleteComment = async (commentId: string) => {
    if (!user) return { error: 'Not authenticated' };

    const { error } = await supabase
      .from('story_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      return { error: error.message };
    }

    setComments(prev => prev.filter(c => c.id !== commentId));
    return { error: null };
  };

  const editComment = async (commentId: string, newContent: string) => {
    if (!user) return { error: 'Not authenticated' };
    const trimmed = newContent.trim();
    if (!trimmed) return { error: 'Comment cannot be empty' };
    if (trimmed.length > 1000) return { error: 'Comment too long (max 1000 characters)' };

    const { error } = await supabase
      .from('story_comments')
      .update({ content: trimmed })
      .eq('id', commentId)
      .eq('user_id', user.id);

    if (error) return { error: error.message };

    setComments(prev => prev.map(c => c.id === commentId ? { ...c, content: trimmed, edited_at: new Date().toISOString() } : c));
    return { error: null };
  };

  return {
    comments,
    isLoading,
    sendComment,
    editComment,
    deleteComment,
    refresh: loadComments,
  };
}
