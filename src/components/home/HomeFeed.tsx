import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import { ArrowPathIcon as Loader2Icon } from '@heroicons/react/24/outline';
import { Sun } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/hooks/useI18n';
import { FeedComposer } from '@/components/feed/FeedComposer';
import { PostCard } from '@/components/feed/PostCard';
import { PostCardSkeleton } from '@/components/feed/PostCardSkeleton';
import { useHomeTheme } from '@/hooks/useHomeTheme';
import { cn } from '@/lib/utils';
import { CEO_USER_ID } from '@/lib/constants';
import { getTodayInUserTimezone } from '@/lib/dateUtils';

const SEED_POST_ID = 'seed-welcome';
const PAGE_SIZE = 10;

interface SeedPostShape {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  author: { display_name: string; avatar_url: string; isTeam?: boolean };
  reactions: { heart: number; userReacted: { heart: boolean } };
}

interface SeedPostProps {
  post: SeedPostShape;
  storageKey: string;
}

function SeedPost({ post, storageKey }: SeedPostProps) {
  const [localReactions, setLocalReactions] = useState(post.reactions);

  const handleSeedReaction = () => {
    const hasReacted = localReactions.userReacted.heart;
    const newReactions = {
      ...localReactions,
      heart: hasReacted ? localReactions.heart - 1 : localReactions.heart + 1,
      userReacted: { ...localReactions.userReacted, heart: !hasReacted }
    };
    setLocalReactions(newReactions);
    localStorage.setItem(storageKey, String(!hasReacted));
  };

  useEffect(() => {
    const heartReacted = localStorage.getItem(storageKey) === 'true';
    setLocalReactions({
      heart: heartReacted ? 1 : 0,
      userReacted: { heart: heartReacted },
    });
  }, [storageKey]);

  return (
    <PostCard
      post={{ ...post, reactions: localReactions }}
      onReactionUpdate={handleSeedReaction}
      isCEO={true}
    />
  );
}

interface FeedRow {
  id: string;
  user_id: string;
  content: string;
  emotion: string | null;
  emotion_wave: string | null;
  moderation_status: string;
  created_at: string;
  updated_at: string;
  author_display_name: string | null;
  author_avatar_url: string | null;
  heart_count: number;
  comment_count: number;
  viewer_reacted: boolean;
}

export function HomeFeed() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { theme } = useHomeTheme();
  const queryClient = useQueryClient();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const realtimeDebounceRef = useRef<number | null>(null);

  const seedPost: SeedPostShape = {
    id: SEED_POST_ID,
    user_id: 'system',
    content: t('feed.seed.content'),
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    author: {
      display_name: t('feed.seed.authorName'),
      avatar_url: '/icon-192.png',
      isTeam: true,
    },
    reactions: { heart: 0, userReacted: { heart: false } },
  };
  const seedStorageKey = `seed-reaction-${SEED_POST_ID}-heart-${user?.id || 'anon'}`;

  // Today's joys count (live counter for header pill)
  const { data: todayCount = 0 } = useQuery({
    queryKey: ['home-feed-today-count', refreshKey],
    queryFn: async () => {
      const todayStr = getTodayInUserTimezone();
      const { count } = await supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', `${todayStr}T00:00:00`);
      return count || 0;
    },
    refetchInterval: 60_000,
  });

  // Cursor-based infinite query via RPC
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['home-feed', refreshKey, user?.id ?? null],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase.rpc('get_feed_with_meta', {
        p_viewer_id: user?.id ?? null,
        p_cursor: pageParam,
        p_limit: PAGE_SIZE,
      });
      if (error) throw error;
      return (data ?? []) as unknown as FeedRow[];
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.length < PAGE_SIZE) return undefined;
      return lastPage[lastPage.length - 1].created_at;
    },
  });

  const displayPosts = useMemo(() => {
    const rows = data?.pages.flat() ?? [];
    return rows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      content: r.content,
      emotion: r.emotion,
      emotion_wave: r.emotion_wave,
      moderation_status: r.moderation_status,
      created_at: r.created_at,
      updated_at: r.updated_at,
      author: {
        user_id: r.user_id,
        display_name: r.author_display_name ?? undefined,
        avatar_url: r.author_avatar_url ?? undefined,
      },
      reactions: {
        heart: Number(r.heart_count) || 0,
        userReacted: { heart: Boolean(r.viewer_reacted) },
      },
      comment_count: Number(r.comment_count) || 0,
    }));
  }, [data]);

  // Debounced refetch for realtime — avoids hammering on bursts
  const scheduleRealtimeRefetch = useCallback(() => {
    if (realtimeDebounceRef.current) {
      window.clearTimeout(realtimeDebounceRef.current);
    }
    realtimeDebounceRef.current = window.setTimeout(() => {
      refetch();
    }, 800);
  }, [refetch]);

  useEffect(() => {
    const channel = supabase
      .channel('home-feed-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, scheduleRealtimeRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_reactions' }, scheduleRealtimeRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_comments' }, scheduleRealtimeRefetch)
      .subscribe();
    return () => {
      if (realtimeDebounceRef.current) window.clearTimeout(realtimeDebounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [scheduleRealtimeRefetch]);

  // Pull-to-refresh
  useEffect(() => {
    let startY = 0;
    const threshold = 80;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (startY === 0 || window.scrollY > 0) return;
      const distance = e.touches[0].clientY - startY;
      if (distance > 0 && distance < 200) {
        setPullDistance(distance);
        setIsPulling(true);
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance >= threshold) {
        setIsRefreshing(true);
        await queryClient.invalidateQueries({ queryKey: ['home-feed'] });
        await refetch();
        setIsRefreshing(false);
      }
      startY = 0;
      setPullDistance(0);
      setIsPulling(false);
    };

    window.addEventListener('touchstart', handleTouchStart as any);
    window.addEventListener('touchmove', handleTouchMove as any);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart as any);
      window.removeEventListener('touchmove', handleTouchMove as any);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, refetch, queryClient]);

  return (
    <div
      data-feed-container
      className={cn(
        'rounded-2xl overflow-hidden',
        theme === 'light'
          ? 'bg-white border border-slate-200/80'
          : 'bg-white/[0.02] border border-white/5'
      )}
    >
      {/* Pull-to-refresh indicator */}
      <AnimatePresence>
        {(isPulling || isRefreshing) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: isRefreshing ? 50 : Math.min(pullDistance * 0.6, 50) }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center overflow-hidden"
          >
            <motion.div
              animate={isRefreshing ? { rotate: 360 } : { rotate: pullDistance * 3 }}
              transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: 'linear' } : { duration: 0 }}
            >
              <ArrowPathIcon
                className={cn(
                  'h-5 w-5 transition-colors',
                  pullDistance >= 80 ? 'text-primary' : theme === 'light' ? 'text-slate-400' : 'text-primary'
                )}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3 border-b',
          theme === 'light'
            ? 'border-slate-200/80 bg-gradient-to-r from-amber-50/80 via-orange-50/60 to-rose-50/40'
            : 'border-white/5 bg-gradient-to-r from-amber-500/[0.06] via-orange-500/[0.04] to-transparent'
        )}
      >
        <div
          className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
            theme === 'light' ? 'bg-amber-100 text-amber-600' : 'bg-amber-500/15 text-amber-400'
          )}
        >
          <Sun className="w-5 h-5" strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <h2
            className={cn(
              'text-[15px] font-semibold leading-tight',
              theme === 'light' ? 'text-amber-900' : 'text-amber-200/95'
            )}
          >
            {t('feed.header.title')}
          </h2>
          <p
            className={cn(
              'text-[12px] leading-tight mt-0.5',
              theme === 'light' ? 'text-amber-700/70' : 'text-amber-200/55'
            )}
          >
            {t('feed.header.subtitle')}
          </p>
        </div>
        <div
          className={cn(
            'flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium tabular-nums',
            theme === 'light'
              ? 'bg-amber-100/80 text-amber-700 ring-1 ring-amber-200'
              : 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20'
          )}
        >
          {todayCount > 0
            ? t('feed.header.todayPill', { count: todayCount })
            : t('feed.header.todayPillEmpty')}
        </div>
      </div>

      {/* Composer */}
      <FeedComposer onPostCreated={() => setRefreshKey((k) => k + 1)} showDailyLimit />

      {/* Feed */}
      {isLoading ? (
        <div>
          <PostCardSkeleton delay={0} />
          <PostCardSkeleton delay={0.1} />
        </div>
      ) : displayPosts.length > 0 ? (
        <div
          className={cn(
            'relative',
            !isExpanded && displayPosts.length > 3 && 'max-h-[400px] overflow-hidden'
          )}
        >
          <div>
            <AnimatePresence mode="popLayout">
              {displayPosts.slice(0, isExpanded ? undefined : 3).map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                  layout
                >
                  <PostCard
                    post={post}
                    onReactionUpdate={() => refetch()}
                    isCEO={post.user_id === CEO_USER_ID}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {!isExpanded && displayPosts.length > 3 && (
            <div
              className={cn(
                'absolute bottom-0 left-0 right-0 h-20 pointer-events-none',
                theme === 'light'
                  ? 'bg-gradient-to-t from-sky-50/95 to-transparent'
                  : 'bg-gradient-to-t from-[#080A10] to-transparent'
              )}
            />
          )}
        </div>
      ) : (
        <SeedPost post={seedPost} storageKey={seedStorageKey} />
      )}

      {/* Expand */}
      {displayPosts.length > 3 && !isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-t',
            theme === 'light'
              ? 'border-slate-200/80 text-slate-600 hover:bg-slate-50'
              : 'border-white/5 text-muted-foreground hover:bg-white/[0.02]'
          )}
        >
          <span>{t('feed.actions.showAll')}</span>
          <ChevronDownIcon className="h-4 w-4" />
        </button>
      )}

      {/* Load more (cursor) */}
      {isExpanded && hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors disabled:opacity-50 border-t',
            theme === 'light'
              ? 'border-slate-200/80 text-slate-600 hover:bg-slate-50'
              : 'border-white/5 text-muted-foreground hover:bg-white/[0.02]'
          )}
        >
          {isFetchingNextPage ? (
            <>
              <Loader2Icon className="h-4 w-4 animate-spin" />
              <span>{t('feed.actions.loading')}</span>
            </>
          ) : (
            <>
              <span>{t('feed.actions.loadMore')}</span>
              <ChevronDownIcon className="h-4 w-4" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
