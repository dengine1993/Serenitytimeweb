import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface UserStory {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  is_anonymous: boolean;
  is_hidden: boolean;
  comment_count: number;
  last_comment_at: string | null;
  created_at: string;
  updated_at: string;
  author?: {
    display_name: string | null;
    avatar_url: string | null;
  };
  is_premium?: boolean;
}

export type StorySortBy = 'comments' | 'newest' | 'mine';

interface UseStoriesOptions {
  sortBy: StorySortBy;
  searchQuery?: string;
}

const STORIES_PER_PAGE = 20;

export function useStories({ sortBy, searchQuery }: UseStoriesOptions) {
  const { user } = useAuth();
  const [stories, setStories] = useState<UserStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const loadStories = useCallback(async (reset = false) => {
    const currentPage = reset ? 0 : page;
    
    if (reset) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      let query = supabase
        .from('user_stories')
        .select('*')
        .eq('is_hidden', false)
        .range(currentPage * STORIES_PER_PAGE, (currentPage + 1) * STORIES_PER_PAGE - 1);

      // Apply sorting
      if (sortBy === 'comments') {
        query = query.order('last_comment_at', { ascending: false, nullsFirst: false })
                     .order('created_at', { ascending: false });
      } else if (sortBy === 'newest') {
        query = query.order('created_at', { ascending: false });
      } else if (sortBy === 'mine' && user) {
        query = supabase
          .from('user_stories')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(currentPage * STORIES_PER_PAGE, (currentPage + 1) * STORIES_PER_PAGE - 1);
      }

      // Apply search filter
      if (searchQuery && searchQuery.trim()) {
        query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
      }

      const { data: storiesData, error } = await query;

      if (error) {
        console.error('Error loading stories:', error);
        return;
      }

      if (storiesData) {
        // Fetch author profiles (for non-anonymous)
        const nonAnonymousStories = storiesData.filter(s => !s.is_anonymous);
        const userIds = [...new Set(nonAnonymousStories.map(s => s.user_id))];

        let profileMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
        let premiumUserIds = new Set<string>();

        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, display_name, avatar_url')
            .in('user_id', userIds);

          const { data: premiumIds } = await supabase
            .rpc('get_premium_user_ids', { user_ids: userIds });

          profileMap = new Map(profiles?.map(p => [p.user_id, { display_name: p.display_name, avatar_url: p.avatar_url }]) || []);
          premiumUserIds = new Set(premiumIds || []);
        }

        const processedStories: UserStory[] = storiesData.map(story => ({
          ...story,
          author: story.is_anonymous ? undefined : profileMap.get(story.user_id),
          is_premium: premiumUserIds.has(story.user_id)
        }));

        if (reset) {
          setStories(processedStories);
          setPage(1);
        } else {
          setStories(prev => [...prev, ...processedStories]);
          setPage(currentPage + 1);
        }

        setHasMore(storiesData.length === STORIES_PER_PAGE);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [page, sortBy, searchQuery, user]);

  // Reset and load when sort or search changes
  useEffect(() => {
    setPage(0);
    loadStories(true);
  }, [sortBy, searchQuery]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('stories-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'user_stories'
      }, async (payload) => {
        const newStory = payload.new as any;
        
        if (newStory.is_hidden) return;

        // Fetch author profile if not anonymous
        let author = undefined;
        let is_premium = false;
        
        if (!newStory.is_anonymous) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('user_id', newStory.user_id)
            .maybeSingle();
          
          const { data: premiumIds } = await supabase
            .rpc('get_premium_user_ids', { user_ids: [newStory.user_id] });
          
          author = profile || undefined;
          is_premium = premiumIds?.includes(newStory.user_id) || false;
        }

        setStories(prev => [{
          ...newStory,
          author,
          is_premium
        }, ...prev]);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_stories'
      }, (payload) => {
        const updated = payload.new as any;
        setStories(prev => prev.map(s => 
          s.id === updated.id 
            ? { ...s, ...updated }
            : s
        ));
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'user_stories'
      }, (payload) => {
        const deleted = payload.old as any;
        setStories(prev => prev.filter(s => s.id !== deleted.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      loadStories(false);
    }
  }, [isLoadingMore, hasMore, loadStories]);

  const createStory = async (content: string, title?: string, isAnonymous = false) => {
    if (!user) return { error: 'Not authenticated' };
    
    if (content.trim().length < 100) {
      return { error: 'Story must be at least 100 characters' };
    }

    // Rate limit: check if user created a story today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: todayStories } = await supabase
      .from('user_stories')
      .select('id')
      .eq('user_id', user.id)
      .gte('created_at', today.toISOString())
      .limit(1);

    if (todayStories && todayStories.length > 0) {
      return { error: 'You can only create one story per day' };
    }

    const { data, error } = await supabase
      .from('user_stories')
      .insert({
        user_id: user.id,
        title: title?.trim() || null,
        content: content.trim(),
        is_anonymous: isAnonymous
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating story:', error);
      return { error: error.message };
    }

    return { data };
  };

  const hideStory = async (storyId: string) => {
    if (!user) return;

    await supabase
      .from('user_stories')
      .update({ is_hidden: true })
      .eq('id', storyId)
      .eq('user_id', user.id);

    setStories(prev => prev.filter(s => s.id !== storyId));
  };

  const deleteStory = async (storyId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('user_stories')
      .delete()
      .eq('id', storyId);

    if (!error) {
      setStories(prev => prev.filter(s => s.id !== storyId));
    }

    return { error };
  };

  return {
    stories,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    createStory,
    hideStory,
    deleteStory,
    refresh: () => loadStories(true)
  };
}
