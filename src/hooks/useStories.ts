import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface UserStory {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  is_hidden: boolean;
  comment_count: number;
  last_comment_at: string | null;
  created_at: string;
  updated_at: string;
  author?: {
    user_id?: string;
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
export const STORY_MIN_LENGTH = 30;
export const STORY_MAX_LENGTH = 10000;

// Экранирование для PostgREST `or(... ilike.%...%)` — спецсимволы ломают фильтр.
function escapeIlikePattern(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/,/g, '\\,')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\*/g, '\\*');
}

async function fetchAuthorMap(userIds: string[]) {
  if (userIds.length === 0) {
    return {
      profileMap: new Map<string, UserStory['author']>(),
      premiumSet: new Set<string>(),
    };
  }
  const [profilesRes, premiumRes] = await Promise.all([
    supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', userIds),
    supabase.rpc('get_premium_user_ids', { user_ids: userIds }),
  ]);
  const profileMap = new Map<string, UserStory['author']>(
    (profilesRes.data || []).map(p => [p.user_id, p as UserStory['author']])
  );
  const premiumSet = new Set<string>((premiumRes.data as string[] | null) || []);
  return { profileMap, premiumSet };
}

export function useStories({ sortBy, searchQuery }: UseStoriesOptions) {
  const { user } = useAuth();
  const [stories, setStories] = useState<UserStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Offset + token: защищают от race при быстрой смене сортировки/поиска.
  const offsetRef = useRef(0);
  const fetchTokenRef = useRef(0);

  const loadStories = useCallback(
    async (reset: boolean) => {
      const myToken = ++fetchTokenRef.current;
      if (reset) {
        offsetRef.current = 0;
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const from = offsetRef.current;
      const to = from + STORIES_PER_PAGE - 1;

      try {
        let query =
          sortBy === 'mine' && user
            ? supabase.from('user_stories').select('*').eq('user_id', user.id)
            : supabase.from('user_stories').select('*').eq('is_hidden', false);

        if (sortBy === 'comments') {
          query = query
            .order('last_comment_at', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false });
        } else {
          query = query.order('created_at', { ascending: false });
        }

        if (searchQuery && searchQuery.trim()) {
          const q = escapeIlikePattern(searchQuery.trim());
          query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%`);
        }

        query = query.range(from, to);

        const { data, error } = await query;

        if (myToken !== fetchTokenRef.current) return;

        if (error) {
          console.error('Error loading stories:', error);
          setHasMore(false);
          return;
        }

        const rows = data || [];
        const userIds = [...new Set(rows.map(s => s.user_id))];
        const { profileMap, premiumSet } = await fetchAuthorMap(userIds);

        if (myToken !== fetchTokenRef.current) return;

        const processed: UserStory[] = rows.map(s => ({
          ...s,
          author: profileMap.get(s.user_id),
          is_premium: premiumSet.has(s.user_id),
        }));

        setStories(prev => {
          if (reset) return processed;
          const seen = new Set(prev.map(p => p.id));
          const merged = [...prev];
          for (const s of processed) {
            if (!seen.has(s.id)) merged.push(s);
          }
          return merged;
        });

        offsetRef.current = from + rows.length;
        setHasMore(rows.length === STORIES_PER_PAGE);
      } finally {
        if (myToken === fetchTokenRef.current) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [sortBy, searchQuery, user]
  );

  // Reset при смене сортировки/поиска/юзера
  useEffect(() => {
    loadStories(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, searchQuery, user?.id]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('stories-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_stories' },
        async (payload) => {
          const newStory = payload.new as any;
          if (newStory.is_hidden) return;
          if (sortBy === 'mine' && newStory.user_id !== user?.id) return;

          const { profileMap, premiumSet } = await fetchAuthorMap([newStory.user_id]);
          setStories(prev => {
            if (prev.some(s => s.id === newStory.id)) return prev;
            return [
              {
                ...newStory,
                author: profileMap.get(newStory.user_id),
                is_premium: premiumSet.has(newStory.user_id),
              },
              ...prev,
            ];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'user_stories' },
        (payload) => {
          const updated = payload.new as any;
          setStories(prev => prev.map(s => (s.id === updated.id ? { ...s, ...updated } : s)));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'user_stories' },
        (payload) => {
          const deleted = payload.old as any;
          setStories(prev => prev.filter(s => s.id !== deleted.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sortBy, user?.id]);

  const loadMore = useCallback(() => {
    if (!isLoadingMore && !isLoading && hasMore) {
      loadStories(false);
    }
  }, [isLoadingMore, isLoading, hasMore, loadStories]);

  const createStory = async (content: string, title?: string) => {
    if (!user) return { error: 'Not authenticated' };

    const trimmed = content.trim();
    if (trimmed.length < STORY_MIN_LENGTH) {
      return { error: `min_length:${STORY_MIN_LENGTH}` };
    }
    if (trimmed.length > STORY_MAX_LENGTH) {
      return { error: 'too_long' };
    }

    // Серверный RPC: атомарная валидация + rate-limit.
    const rpc = await (supabase.rpc as any)('create_user_story', {
      p_content: trimmed,
      p_title: title?.trim() || null,
    });

    if (!rpc.error) {
      return { data: { id: rpc.data } };
    }

    const msg = rpc.error.message || '';
    // Если RPC ещё не задеплоен — fallback на прямой insert + клиентский лимит.
    const isMissing = /PGRST202|not exist|not found|create_user_story/i.test(msg);
    if (!isMissing) {
      if (/Rate limit/i.test(msg)) return { error: 'rate_limit' };
      if (/too short/i.test(msg)) return { error: `min_length:${STORY_MIN_LENGTH}` };
      if (/too long/i.test(msg)) return { error: 'too_long' };
      return { error: msg };
    }

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from('user_stories')
      .select('id')
      .eq('user_id', user.id)
      .gte('created_at', dayAgo)
      .limit(1);

    if (recent && recent.length > 0) {
      return { error: 'rate_limit' };
    }

    const { data, error } = await supabase
      .from('user_stories')
      .insert({
        user_id: user.id,
        title: title?.trim() || null,
        content: trimmed,
      })
      .select()
      .single();

    if (error) return { error: error.message };
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
    if (!user) return { error: 'Not authenticated' };
    const { error } = await supabase.from('user_stories').delete().eq('id', storyId);
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
    refresh: () => loadStories(true),
  };
}
