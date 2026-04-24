import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import { ArrowPathIcon as Loader2Icon } from '@heroicons/react/24/outline';
import { Sun } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { FeedComposer } from '@/components/feed/FeedComposer';
import { PostCard } from '@/components/feed/PostCard';
import { PostCardSkeleton } from '@/components/feed/PostCardSkeleton';
import { useHomeTheme } from '@/hooks/useHomeTheme';
import { cn } from '@/lib/utils';
import { CEO_USER_ID } from '@/lib/constants';
import { getTodayInUserTimezone } from '@/lib/dateUtils';

// Single seed post — warm welcome from team
const SEED_POST = {
  id: 'seed-welcome',
  user_id: 'system',
  content: 'Здесь живут маленькие радости ☀️\n\nКофе, объятие, солнечный луч в окне — всё, что согрело сегодня. Поделись своим — и зажги чей-то день в ответ 💛',
  created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  author: {
    display_name: 'Команда Безмятежных',
    avatar_url: '/icon-192.png',
    isTeam: true
  },
  reactions: {
    heart: 0,
    userReacted: { heart: false }
  }
};

interface SeedPostProps {
  post: typeof SEED_POST;
}

function SeedPost({ post }: SeedPostProps) {
  const [localReactions, setLocalReactions] = useState(post.reactions);
  
  const handleSeedReaction = () => {
    const hasReacted = localReactions.userReacted.heart;
    const newReactions = {
      ...localReactions,
      heart: hasReacted ? localReactions.heart - 1 : localReactions.heart + 1,
      userReacted: {
        ...localReactions.userReacted,
        heart: !hasReacted
      }
    };
    setLocalReactions(newReactions);
    localStorage.setItem(`seed-reaction-${post.id}-heart`, String(!hasReacted));
  };

  useEffect(() => {
    const heartReacted = localStorage.getItem(`seed-reaction-${post.id}-heart`) === 'true';
    if (heartReacted) {
      setLocalReactions({
        heart: 1,
        userReacted: { heart: true }
      });
    }
  }, [post.id]);

  return (
    <PostCard 
      post={{ ...post, reactions: localReactions }} 
      onReactionUpdate={handleSeedReaction}
      isCEO={true}
    />
  );
}

export function HomeFeed() {
  const { user } = useAuth();
  const { theme } = useHomeTheme();
  const queryClient = useQueryClient();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [postLimit, setPostLimit] = useState(5);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

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

  const { data: posts, isLoading, refetch } = useQuery({
    queryKey: ['home-feed', refreshKey, postLimit],
    queryFn: async () => {
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(postLimit);

      if (postsError) throw postsError;

      const userIds = [...new Set(postsData.map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const postIds = postsData.map(p => p.id);
      const { data: reactions } = await supabase
        .from('post_reactions')
        .select('*')
        .in('post_id', postIds);

      const reactionsByPost = new Map<string, any>();
      reactions?.forEach(reaction => {
        if (!reactionsByPost.has(reaction.post_id)) {
          reactionsByPost.set(reaction.post_id, {
            heart: 0,
            userReacted: { heart: false }
          });
        }
        const postReactions = reactionsByPost.get(reaction.post_id);
        if (reaction.reaction_type === 'support') {
          postReactions.heart++;
          if (user && reaction.user_id === user.id) {
            postReactions.userReacted.heart = true;
          }
        }
      });

      return postsData.map(post => {
        const profile = profileMap.get(post.user_id);
        return {
          ...post,
          author: profile ? {
            display_name: profile.display_name,
            avatar_url: profile.avatar_url
          } : undefined,
          reactions: reactionsByPost.get(post.id) || {
            heart: 0,
            userReacted: { heart: false }
          }
        };
      });
    }
  });

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase.channel('home-feed-posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetch]);

  useEffect(() => {
    const channel = supabase.channel('home-feed-reactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_reactions' }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetch]);

  // Realtime subscription for comments count
  useEffect(() => {
    const channel = supabase.channel('home-feed-comments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_comments' }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetch]);

  // Pull-to-refresh
  useEffect(() => {
    const container = document.querySelector('[data-feed-container]');
    if (!container) return;

    let startY = 0;
    const threshold = 80;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        setPullStartY(startY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (startY === 0 || window.scrollY > 0) return;
      const currentY = e.touches[0].clientY;
      const distance = currentY - startY;
      if (distance > 0 && distance < 200) {
        setPullDistance(distance);
        setIsPulling(true);
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance >= threshold) {
        setIsRefreshing(true);
        // Invalidate cache to force fresh data fetch
        await queryClient.invalidateQueries({ queryKey: ['home-feed'] });
        await refetch();
        setIsRefreshing(false);
      }
      startY = 0;
      setPullStartY(0);
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
  }, [pullDistance, refetch]);

  const displayPosts = posts || [];
  const hasMorePosts = displayPosts.length >= postLimit;

  return (
    <div 
      data-feed-container
      className={cn(
        "rounded-2xl overflow-hidden",
        theme === 'light'
          ? "bg-white border border-slate-200/80"
          : "bg-white/[0.02] border border-white/5"
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
              transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: "linear" } : { duration: 0 }}
            >
              <ArrowPathIcon className={cn(
                "h-5 w-5 transition-colors",
                pullDistance >= 80 ? "text-primary" : theme === 'light' ? "text-slate-400" : "text-primary"
              )} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* "Small Joys" header — gives feed identity */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-3 border-b",
        theme === 'light'
          ? "border-slate-200/80 bg-gradient-to-r from-amber-50/80 via-orange-50/60 to-rose-50/40"
          : "border-white/5 bg-gradient-to-r from-amber-500/[0.06] via-orange-500/[0.04] to-transparent"
      )}>
        <div className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
          theme === 'light'
            ? "bg-amber-100 text-amber-600"
            : "bg-amber-500/15 text-amber-400"
        )}>
          <Sun className="w-5 h-5" strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className={cn(
            "text-[15px] font-semibold leading-tight",
            theme === 'light' ? "text-amber-900" : "text-amber-200/95"
          )}>
            Маленькие радости
          </h2>
          <p className={cn(
            "text-[12px] leading-tight mt-0.5",
            theme === 'light' ? "text-amber-700/70" : "text-amber-200/55"
          )}>
            Один тёплый момент в день — твой и других
          </p>
        </div>
        <div className={cn(
          "flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium tabular-nums",
          theme === 'light'
            ? "bg-amber-100/80 text-amber-700 ring-1 ring-amber-200"
            : "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20"
        )}>
          {todayCount > 0 ? `Сегодня · ${todayCount}` : 'Сегодня'}
        </div>
      </div>

      {/* Unified Twitter-style Composer */}
      <FeedComposer onPostCreated={() => setRefreshKey(k => k + 1)} showDailyLimit />

      {/* Feed content - no separate header */}
      {isLoading ? (
        <div>
          <PostCardSkeleton delay={0} />
          <PostCardSkeleton delay={0.1} />
        </div>
      ) : displayPosts.length > 0 ? (
        <div className={cn(
          "relative",
          !isExpanded && displayPosts.length > 3 && "max-h-[400px] overflow-hidden"
        )}>
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
                  <PostCard post={post} onReactionUpdate={() => refetch()} isCEO={post.user_id === CEO_USER_ID} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Fade gradient for collapsed state */}
          {!isExpanded && displayPosts.length > 3 && (
            <div className={cn(
              "absolute bottom-0 left-0 right-0 h-20 pointer-events-none",
              theme === 'light'
                ? "bg-gradient-to-t from-sky-50/95 to-transparent"
                : "bg-gradient-to-t from-[#080A10] to-transparent"
            )} />
          )}
        </div>
      ) : (
        /* Seed post when no posts */
        <SeedPost post={SEED_POST} />
      )}

      {/* Expand/Load more button */}
      {displayPosts.length > 3 && !isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-t",
            theme === 'light'
              ? "border-slate-200/80 text-slate-600 hover:bg-slate-50"
              : "border-white/5 text-muted-foreground hover:bg-white/[0.02]"
          )}
        >
          <span>Показать все</span>
          <ChevronDownIcon className="h-4 w-4" />
        </button>
      )}

      {/* Load more when expanded */}
      {isExpanded && hasMorePosts && (
        <button
          onClick={async () => {
            setIsLoadingMore(true);
            setPostLimit(prev => prev + 10);
            await refetch();
            setIsLoadingMore(false);
          }}
          disabled={isLoadingMore}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors disabled:opacity-50 border-t",
            theme === 'light'
              ? "border-slate-200/80 text-slate-600 hover:bg-slate-50"
              : "border-white/5 text-muted-foreground hover:bg-white/[0.02]"
          )}
        >
          {isLoadingMore ? (
            <>
              <Loader2Icon className="h-4 w-4 animate-spin" />
              <span>Загрузка...</span>
            </>
          ) : (
            <>
              <span>Ещё</span>
              <ChevronDownIcon className="h-4 w-4" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
