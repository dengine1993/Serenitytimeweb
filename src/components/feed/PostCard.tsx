import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/hooks/useI18n';
import { toast } from 'sonner';
import { useHomeTheme } from '@/hooks/useHomeTheme';
import { ChatBubbleLeftIcon, FlagIcon } from '@heroicons/react/24/solid';
import { ChatBubbleLeftIcon as ChatBubbleLeftOutlineIcon, FlagIcon as FlagOutlineIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
import { Sun } from 'lucide-react';
import Twemoji from 'react-twemoji';
import { PostComments } from './PostComments';

import { CEOAvatar } from '@/components/common/CEOAvatar';
import { CEOBadge } from '@/components/common/CEOBadge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
interface PostCardProps {
  post: {
    id: string;
    user_id: string;
    content: string;
    created_at: string;
    author?: {
      user_id?: string;
      display_name?: string;
      avatar_url?: string;
    };
    reactions?: {
      heart: number;
      userReacted?: {
        heart: boolean;
      };
    };
    commentsCount?: number;
  };
  onReactionUpdate?: () => void;
  isCEO?: boolean;
}

export function PostCard({ post, onReactionUpdate, isCEO = false }: PostCardProps) {
  const { user } = useAuth();
  const { t, language } = useI18n();
  const { theme } = useHomeTheme();
  
  const [reacting, setReacting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [timeString, setTimeString] = useState(() => formatTime(post.created_at, t, language));
  const [burstEffect, setBurstEffect] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0);
  
  const isOwnPost = user?.id === post.user_id;

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeString(formatTime(post.created_at, t, language));
    }, 60000);
    return () => clearInterval(interval);
  }, [post.created_at, t, language]);

  // Re-render time when language changes
  useEffect(() => {
    setTimeString(formatTime(post.created_at, t, language));
  }, [language, post.created_at, t]);

  // Fetch comments count and subscribe to realtime updates
  useEffect(() => {
    const fetchCommentsCount = async () => {
      const { count } = await supabase
        .from('post_comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);
      
      if (count !== null) {
        setCommentsCount(count);
      }
    };
    
    fetchCommentsCount();

    // Realtime subscription for comment count updates
    const channel = supabase
      .channel(`post-comments-${post.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_comments',
          filter: `post_id=eq.${post.id}`
        },
        async () => {
          // Refetch count when comments change
          const { count } = await supabase
            .from('post_comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);
          
          if (count !== null) {
            setCommentsCount(count);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [post.id]);

  function formatTime(dateString: string, t: (k: string, p?: Record<string, unknown>) => string, language: 'ru' | 'en') {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('feed.post.now');
    if (diffMins < 60) return t('feed.post.minutes', { n: diffMins });
    if (diffHours < 24) return t('feed.post.hours', { n: diffHours });
    if (diffDays < 7) return t('feed.post.days', { n: diffDays });
    return date.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short' });
  }

  const handleReaction = async () => {
    if (!user || reacting) return;

    setReacting(true);
    try {
      const hasReacted = post.reactions?.userReacted?.heart;

      if (hasReacted) {
        const { error } = await supabase
          .from('post_reactions')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id)
          .eq('reaction_type', 'support');

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('post_reactions')
          .insert({
            post_id: post.id,
            user_id: user.id,
            reaction_type: 'support',
          });

        if (error) throw error;
        
        setBurstEffect(true);
        setTimeout(() => setBurstEffect(false), 600);
      }

      onReactionUpdate?.();
    } catch (error) {
      console.error('Error toggling reaction:', error);
      toast.error(t('feed.post.reactionFail'));
    } finally {
      setReacting(false);
    }
  };

  const handleCommentsCountChange = (newCount: number) => {
    setCommentsCount(newCount);
  };

  const isLongContent = post.content.length > 280;
  const displayContent = expanded || !isLongContent ? post.content : post.content.slice(0, 280) + '...';
  const hasReacted = post.reactions?.userReacted?.heart;
  const heartCount = post.reactions?.heart || 0;

  return (
    <div
      className={cn(
        "relative px-4 py-3",
        "border-b transition-colors",
        theme === 'light'
          ? "border-slate-200/80 hover:bg-slate-50/50"
          : "border-white/5 hover:bg-white/[0.02]"
      )}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        {isCEO ? (
          <CEOAvatar size="lg" avatarUrl={post.author?.avatar_url} />
        ) : (
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={post.author?.avatar_url} />
            <AvatarFallback className={cn(
              "text-sm font-medium",
              theme === 'light' 
                ? "bg-sky-100 text-sky-600" 
                : "bg-primary/20 text-primary"
            )}>
              {post.author?.display_name?.charAt(0)?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
        )}

        {/* Content area */}
        <div className="flex-1 min-w-0">
          {/* Header row with name, badge, and time */}
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <span
              className={cn(
                "text-[15px] font-semibold truncate text-left",
                theme === 'light' ? "text-gray-900" : "text-foreground"
              )}
            >
              {post.author?.display_name || '—'}
            </span>
            
            {/* Inline CEO badge */}
            {isCEO && <CEOBadge />}
            
            <span className={cn(
              "text-[13px] flex-shrink-0",
              theme === 'light' ? "text-gray-500" : "text-muted-foreground"
            )}>
              · {timeString}
            </span>
          </div>

          {/* Post content with Twemoji for emoji in text */}
          <div className="mb-2.5">
            <Twemoji options={{ className: 'twemoji-inline' }}>
              <p className={cn(
                "text-[15px] leading-[1.4] whitespace-pre-wrap break-words",
                theme === 'light' ? "text-gray-800" : "text-foreground/95"
              )}>
                {displayContent}
              </p>
            </Twemoji>
            {isLongContent && !expanded && (
              <button
                onClick={() => setExpanded(true)}
                className="text-[13px] text-primary hover:underline mt-1"
              >
                {t('feed.post.expand')}
              </button>
            )}
          </div>

          {/* Compact Twitter-style actions */}
          <div className="flex items-center gap-2 -ml-2">
            {/* Comment button */}
            <motion.button
              onClick={() => setShowComments(!showComments)}
              whileTap={{ scale: 0.9 }}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full transition-colors group",
                showComments
                  ? "text-sky-500"
                  : theme === 'light' 
                    ? "text-gray-400 hover:text-sky-500" 
                    : "text-muted-foreground/60 hover:text-sky-500"
              )}
              aria-label={t('feed.post.commentsAria', { count: commentsCount })}
            >
              {showComments ? (
                <ChatBubbleLeftIcon className="h-[18px] w-[18px]" />
              ) : (
                <ChatBubbleLeftOutlineIcon className="h-[18px] w-[18px] group-hover:scale-110 transition-transform" />
              )}
              
              {commentsCount > 0 && (
                <span className="text-[13px] font-medium">
                  {commentsCount}
                </span>
              )}
            </motion.button>

            {/* "Proud" reaction — Sun icon (Sunrise concept) */}
            <motion.button
              onClick={handleReaction}
              disabled={reacting}
              whileTap={{ scale: 0.9 }}
              className={cn(
                "relative flex items-center gap-1 px-2 py-1 rounded-full transition-colors group",
                hasReacted
                  ? "text-amber-500"
                  : theme === 'light'
                    ? "text-gray-400 hover:text-amber-500"
                    : "text-muted-foreground/60 hover:text-amber-400"
              )}
              aria-label={t('feed.post.warmedAria', { count: heartCount })}
              title={t('feed.post.warmed')}
            >
              <span className="relative">
                <Sun
                  className={cn(
                    "h-[18px] w-[18px] transition-transform group-hover:scale-110",
                    hasReacted && "drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]"
                  )}
                  strokeWidth={hasReacted ? 2.4 : 2}
                  fill={hasReacted ? 'currentColor' : 'none'}
                />

                {/* Burst effect */}
                <AnimatePresence>
                  {burstEffect && (
                    <motion.div
                      initial={{ scale: 0.5, opacity: 1 }}
                      animate={{ scale: 2, opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      className="absolute inset-0 rounded-full bg-amber-400/40 pointer-events-none"
                    />
                  )}
                </AnimatePresence>
              </span>

              {heartCount > 0 ? (
                <motion.span
                  key={heartCount}
                  initial={{ scale: 1 }}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.2 }}
                  className="text-[13px] font-medium"
                >
                  {heartCount}
                </motion.span>
              ) : (
                <span className="text-[13px] font-medium hidden sm:inline">
                  {t('feed.post.warmed')}
                </span>
              )}
            </motion.button>

          </div>

          {/* Comments section */}
          <AnimatePresence>
            {showComments && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                onAnimationComplete={(def) => {
                  // After the open animation finishes, drop overflow-hidden
                  // so Jiva's outer ring/glow isn't clipped on the left edge.
                  const el = document.getElementById(`post-comments-wrap-${post.id}`);
                  if (!el) return;
                  if (typeof def === 'object' && def && (def as { opacity?: number }).opacity === 1) {
                    el.style.overflow = 'visible';
                  } else {
                    el.style.overflow = 'hidden';
                  }
                }}
                id={`post-comments-wrap-${post.id}`}
                className="overflow-hidden"
              >
                <PostComments 
                  postId={post.id}
                  postAuthorId={post.user_id}
                  postContent={post.content}
                  onCountChange={handleCommentsCountChange}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

    </div>
  );
}
