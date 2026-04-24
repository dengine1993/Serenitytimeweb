import { useState, useEffect, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePremiumStatus } from '@/hooks/useEntitlements';
import { useCommunityRestriction } from '@/hooks/useCommunityRestriction';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { toast } from 'sonner';
import { useHomeTheme } from '@/hooks/useHomeTheme';
import { PaperAirplaneIcon, TrashIcon, ArrowUturnLeftIcon, XMarkIcon, ShieldExclamationIcon, FlagIcon } from '@heroicons/react/24/solid';
import Twemoji from 'react-twemoji';
import { JivaReplyUpsellModal } from './JivaReplyUpsellModal';
import { CommentReportModal } from './CommentReportModal';
import { Loader2 } from 'lucide-react';
import { CEO_USER_ID, JIVA_BOT_USER_ID } from '@/lib/constants';
import { CEOAvatar } from '@/components/common/CEOAvatar';
import { CEOBadge } from '@/components/common/CEOBadge';
import jivaLogo from '@/assets/jiva.png';

interface Comment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  parent_id: string | null;
  is_jiva?: boolean;
  author?: {
    display_name?: string;
    avatar_url?: string;
  };
  parentComment?: Comment | null;
}

interface PostCommentsProps {
  postId: string;
  postAuthorId: string; // Author of the post — only they can reply to Jiva
  postContent?: string;
  onCountChange?: (count: number) => void;
}

// Reusable Jiva avatar with violet glow
function JivaAvatar({ size = 28 }: { size?: number }) {
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full bg-violet-400/30 blur-md" />
      <img
        src={jivaLogo}
        alt="Jiva"
        className="relative rounded-full object-cover ring-2 ring-violet-300/40"
        style={{ width: size, height: size }}
      />
    </div>
  );
}

export function PostComments({ postId, postAuthorId, postContent, onCountChange }: PostCommentsProps) {
  const { user, session } = useAuth();
  const { isPremium, loading: premiumLoading } = usePremiumStatus();
  const { isRestricted, remainingTime } = useCommunityRestriction();
  const { theme } = useHomeTheme();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [upsellContext, setUpsellContext] = useState<'trial_limit' | 'trial_used' | 'default'>('default');
  const [jivaTyping, setJivaTyping] = useState(false);
  const [jivaRepliesRemaining, setJivaRepliesRemaining] = useState<number | null>(null);
  const [dailyLimitReached, setDailyLimitReached] = useState(false);
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(null);

  const [trialPostId, setTrialPostId] = useState<string | null>(null);
  const [trialRepliesUsed, setTrialRepliesUsed] = useState(0);
  const [trialAvailable, setTrialAvailable] = useState(false);
  const [trialCompleted, setTrialCompleted] = useState(false);

  const fetchJivaUsage = async () => {
    if (!user) return;

    if (isPremium) {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('feature_usage')
        .select('daily_count')
        .eq('user_id', user.id)
        .eq('feature', 'jiva_replies')
        .eq('usage_date', today)
        .single();

      const used = data?.daily_count || 0;
      const remaining = Math.max(0, 3 - used);
      setJivaRepliesRemaining(remaining);
      setDailyLimitReached(remaining === 0);
    } else {
      const { data: allTrials } = await supabase
        .from('feature_usage')
        .select('daily_count, feature')
        .eq('user_id', user.id)
        .like('feature', 'jiva_trial:%');

      if (!allTrials || allTrials.length === 0) {
        setTrialAvailable(true);
        setTrialPostId(null);
        setTrialRepliesUsed(0);
        setTrialCompleted(false);
      } else {
        const currentTrialFeature = `jiva_trial:${postId}`;
        const currentTrial = allTrials.find(t => t.feature === currentTrialFeature);
        const anyOtherTrial = allTrials.find(t => t.feature !== currentTrialFeature);

        if (currentTrial) {
          const usedCount = currentTrial.daily_count || 0;
          setTrialPostId(postId);
          setTrialRepliesUsed(usedCount);
          setTrialCompleted(usedCount >= 3);
          setTrialAvailable(usedCount < 3);
        } else if (anyOtherTrial) {
          const usedPostId = anyOtherTrial.feature.replace('jiva_trial:', '');
          setTrialPostId(usedPostId);
          setTrialRepliesUsed(anyOtherTrial.daily_count || 0);
          setTrialCompleted(true);
          setTrialAvailable(false);
        }
      }
    }
  };

  useEffect(() => {
    if (user && !premiumLoading) {
      fetchJivaUsage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPremium, user, premiumLoading, postId]);

  const fetchComments = useCallback(async () => {
    const { data, error } = await supabase
      .from('post_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return;
    }

    const userIds = [...new Set(data.map(c => c.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', userIds);

    const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    const commentsWithAuthors = data.map(comment => ({
      ...comment,
      author: profilesMap.get(comment.user_id) || {}
    }));

    const commentsById = new Map(commentsWithAuthors.map(c => [c.id, c]));

    const flatComments: Comment[] = commentsWithAuthors.map(comment => ({
      ...comment,
      parentComment: comment.parent_id ? commentsById.get(comment.parent_id) || null : null
    }));

    setComments(flatComments);
    onCountChange?.(flatComments.length);
    setLoading(false);
  }, [postId, onCountChange]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    const channel = supabase
      .channel(`post-comments-${postId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'post_comments',
        filter: `post_id=eq.${postId}`
      }, (payload) => {
        const newId = (payload.new as { id?: string })?.id;
        setComments(prev => {
          const exists = prev.some(c => c.id === newId);
          if (!exists) {
            fetchComments();
          }
          return prev;
        });
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'post_comments',
        filter: `post_id=eq.${postId}`
      }, () => {
        fetchComments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, fetchComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim() || submitting || isRestricted) return;

    const isReplyingToJiva = replyingTo?.is_jiva || replyingTo?.user_id === JIVA_BOT_USER_ID;

    if (isReplyingToJiva) {
      if (!isPremium) {
        const hasTrialReplies = trialPostId === null || (trialPostId === postId && trialRepliesUsed < 3);

        if (!hasTrialReplies) {
          if (trialPostId && trialPostId !== postId) {
            setUpsellContext('trial_used');
          } else {
            setUpsellContext('trial_limit');
          }
          setShowUpsellModal(true);
          return;
        }
      }

      setSubmitting(true);
      setJivaTyping(true);

      try {
        const response = await fetch(
          `https://hvtpfbfawhmkvjtcyaxs.supabase.co/functions/v1/reply-to-jiva`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({
              commentId: replyingTo.id,
              replyContent: newComment.trim(),
              postContent: postContent,
              jivaComment: replyingTo.content,
              postId: postId,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          if (data.code === 'PREMIUM_REQUIRED') {
            setUpsellContext('default');
            setShowUpsellModal(true);
            return;
          }
          if (data.code === 'DAILY_LIMIT_REACHED') {
            setDailyLimitReached(true);
            setJivaRepliesRemaining(0);
            toast.error('Лимит ответов Jiva на сегодня исчерпан');
            return;
          }
          if (data.code === 'TRIAL_LIMIT_REACHED') {
            setTrialCompleted(true);
            setTrialAvailable(false);
            setUpsellContext('trial_limit');
            setShowUpsellModal(true);
            return;
          }
          if (data.code === 'TRIAL_POST_USED') {
            setTrialPostId(data.trialPostId);
            setUpsellContext('trial_used');
            setShowUpsellModal(true);
            return;
          }
          throw new Error(data.error || 'Failed to reply');
        }

        if (typeof data.remaining === 'number') {
          if (isPremium) {
            setJivaRepliesRemaining(data.remaining);
            setDailyLimitReached(data.remaining === 0);
          } else {
            setTrialRepliesUsed(3 - data.remaining);
            setTrialPostId(postId);
            setTrialAvailable(data.remaining > 0);

            if (data.trialCompleted) {
              setTrialCompleted(true);
              toast('Пробный диалог завершён! С Опорой: 3 ответа Jiva в день под любым постом 💬', {
                duration: 5000,
              });
            } else {
              toast(`Jiva ответила! Осталось ${data.remaining} из 3 в пробном диалоге`, {
                duration: 3000,
              });
            }
          }
        }

        setNewComment('');
        setReplyingTo(null);
        await fetchComments();
        await fetchJivaUsage();
      } catch (error) {
        console.error('Error replying to Jiva:', error);
        toast.error('Не удалось отправить ответ');
      } finally {
        setSubmitting(false);
        setJivaTyping(false);
      }
    } else {
      setSubmitting(true);
      try {
        const { error } = await supabase
          .from('post_comments')
          .insert({
            post_id: postId,
            user_id: user.id,
            content: newComment.trim(),
            parent_id: replyingTo?.id || null,
          });

        if (error) throw error;

        setNewComment('');
        setReplyingTo(null);
        fetchComments();
      } catch (error) {
        console.error('Error adding comment:', error);
        toast.error('Не удалось добавить комментарий');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const { isAdmin } = useIsAdmin();

  const handleDelete = async (commentId: string, commentAuthorId: string) => {
    if (!user) return;

    if (commentAuthorId !== user.id && !isAdmin) {
      toast.error('Нет прав для удаления этого комментария');
      return;
    }

    try {
      const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      fetchComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Не удалось удалить комментарий');
    }
  };

  const handleReplyClick = (comment: Comment) => {
    const isJiva = comment.is_jiva || comment.user_id === JIVA_BOT_USER_ID;
    const isPostAuthor = user?.id === postAuthorId;

    if (isJiva && !isPostAuthor) return;

    if (isJiva) {
      if (isPremium) {
        if (dailyLimitReached) {
          toast.error('Лимит ответов Jiva на сегодня исчерпан (3/3)');
          return;
        }
      } else {
        if (trialPostId && trialPostId !== postId) {
          setUpsellContext('trial_used');
          setShowUpsellModal(true);
          return;
        }
        if (trialCompleted) {
          setUpsellContext('trial_limit');
          setShowUpsellModal(true);
          return;
        }
      }
    }

    setReplyingTo(comment);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'сейчас';
    if (diffMins < 60) return `${diffMins}м`;
    if (diffHours < 24) return `${diffHours}ч`;
    if (diffDays < 7) return `${diffDays}д`;
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  const scrollToComment = (commentId: string) => {
    const el = document.getElementById(`comment-${commentId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-primary/50', 'ring-offset-2');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-primary/50', 'ring-offset-2');
      }, 1500);
    }
  };

  const CommentItem = ({ comment }: { comment: Comment }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const isJiva = comment.is_jiva || comment.user_id === JIVA_BOT_USER_ID;
    const isPostAuthor = user?.id === postAuthorId;
    const canReplyToJiva = isJiva && isPostAuthor && user;

    const hasTrialAvailable = !isPremium && isPostAuthor && (trialPostId === null || (trialPostId === postId && !trialCompleted));
    const isTrialBlocked = !isPremium && isPostAuthor && ((trialPostId !== null && trialPostId !== postId) || trialCompleted);

    const parentIsJiva = comment.parentComment?.is_jiva || comment.parentComment?.user_id === JIVA_BOT_USER_ID;

    const MAX_LENGTH = 200;
    const isLongComment = comment.content.length > MAX_LENGTH;
    const displayContent = isLongComment && !isExpanded
      ? comment.content.slice(0, MAX_LENGTH) + "..."
      : comment.content;

    return (
      <div
        id={`comment-${comment.id}`}
        className={cn(
          "transition-all duration-300 rounded-lg",
          comment.parentComment && "ml-4"
        )}
      >
        <motion.div
          layout
          initial={false}
          animate={{ opacity: 1 }}
          className="flex gap-2 group"
        >
          {/* Jiva Avatar — round logo with violet glow */}
          {isJiva ? (
            <JivaAvatar size={28} />
          ) : comment.user_id === CEO_USER_ID ? (
            <CEOAvatar size="sm" />
          ) : (
            <Avatar className="h-7 w-7 flex-shrink-0">
              <AvatarImage src={comment.author?.avatar_url} />
              <AvatarFallback className={cn(
                "text-[10px] font-medium",
                theme === 'light'
                  ? "bg-sky-100 text-sky-600"
                  : "bg-primary/20 text-primary"
              )}>
                {comment.author?.display_name?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          )}

          <div className="flex-1 min-w-0 max-w-[85%]">
            <div className={cn(
              "inline-block rounded-2xl px-3 py-1.5",
              isJiva
                ? "bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/20 border border-violet-200/40 dark:border-violet-500/20"
                : theme === 'light'
                  ? "bg-slate-100"
                  : "bg-white/5"
            )}>
              {comment.parentComment && (
                <button
                  onClick={() => scrollToComment(comment.parentComment!.id)}
                  className={cn(
                    "block text-[11px] mb-1.5 w-full text-left",
                    "border-l-2 pl-2 py-0.5 rounded-sm",
                    parentIsJiva
                      ? "border-violet-500 bg-violet-500/5"
                      : theme === 'light'
                        ? "border-sky-400 bg-sky-50/50"
                        : "border-sky-400/50 bg-sky-500/5"
                  )}
                >
                  <span className={cn(
                    "font-medium",
                    parentIsJiva ? "text-violet-500" : "text-sky-500"
                  )}>
                    {parentIsJiva ? 'Jiva' : (comment.parentComment.author?.display_name || 'Аноним')}
                  </span>
                  <span className="block opacity-60 line-clamp-2 break-words">
                    {comment.parentComment.content}
                  </span>
                </button>
              )}

              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={cn(
                  "text-[13px] font-semibold",
                  isJiva ? "text-violet-700 dark:text-violet-300" : theme === 'light' ? "text-gray-900" : "text-foreground"
                )}>
                  {isJiva ? 'Jiva' : (comment.author?.display_name || 'Аноним')}
                </span>
                {isJiva && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-medium">
                    AI
                  </span>
                )}
                {!isJiva && comment.user_id === CEO_USER_ID && <CEOBadge />}
                <span className={cn(
                  "text-[11px]",
                  theme === 'light' ? "text-gray-400" : "text-muted-foreground/50"
                )}>
                  {formatTime(comment.created_at)}
                </span>
              </div>

              <Twemoji options={{ className: 'twemoji-inline' }}>
                <p className={cn(
                  "text-[13px] leading-[1.3] break-words",
                  isJiva
                    ? "text-foreground/85"
                    : theme === 'light' ? "text-gray-700" : "text-foreground/90"
                )}>
                  {displayContent}
                </p>
              </Twemoji>
              {isLongComment && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className={cn(
                    "text-[11px] font-medium mt-1 transition-colors",
                    theme === 'light' ? "text-sky-500 hover:text-sky-600" : "text-primary hover:text-primary/80"
                  )}
                >
                  {isExpanded ? "Свернуть" : "Показать полностью"}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 mt-0.5 ml-1">
              {user && (!isJiva || canReplyToJiva) &&
               !(isJiva && ((isPremium && dailyLimitReached) || (!isPremium && isTrialBlocked))) && (
                <button
                  onClick={() => handleReplyClick(comment)}
                  className={cn(
                    "flex items-center gap-1 text-[11px] font-medium transition-colors",
                    isJiva && !isPremium && hasTrialAvailable && trialPostId === null
                      ? "text-emerald-500 hover:text-emerald-600"
                      : theme === 'light'
                        ? "text-gray-400 hover:text-sky-500"
                        : "text-muted-foreground/50 hover:text-sky-400"
                  )}
                >
                  <ArrowUturnLeftIcon className="h-3 w-3" />
                  <span>Ответить</span>
                  {isJiva && !isPremium && hasTrialAvailable && trialPostId === null && (
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full ml-0.5">
                      пробный
                    </span>
                  )}
                </button>
              )}

              {(user?.id === comment.user_id || isAdmin) && (
                <button
                  onClick={() => handleDelete(comment.id, comment.user_id)}
                  className={cn(
                    "opacity-0 group-hover:opacity-100 transition-opacity",
                    "p-1 rounded-full hover:bg-red-500/10",
                    theme === 'light' ? "text-gray-400 hover:text-red-500" : "text-muted-foreground/50 hover:text-red-400"
                  )}
                  aria-label="Удалить комментарий"
                >
                  <TrashIcon className="h-3 w-3" />
                </button>
              )}

              {user && user.id !== comment.user_id && !isJiva && (
                <button
                  onClick={() => setReportingCommentId(comment.id)}
                  className={cn(
                    "opacity-0 group-hover:opacity-100 transition-opacity",
                    "p-1 rounded-full hover:bg-amber-500/10",
                    theme === 'light' ? "text-gray-400 hover:text-amber-500" : "text-muted-foreground/50 hover:text-amber-400"
                  )}
                  aria-label="Пожаловаться"
                >
                  <FlagIcon className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  const isReplyingToJiva = replyingTo?.is_jiva || replyingTo?.user_id === JIVA_BOT_USER_ID;

  return (
    <div className={cn(
      "mt-3 pt-3 border-t",
      theme === 'light' ? "border-slate-200/60" : "border-white/5"
    )}>
      <div className="space-y-2">
        {comments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} />
        ))}

        {loading && (
          <div className={cn(
            "text-[13px] text-center py-2",
            theme === 'light' ? "text-gray-400" : "text-muted-foreground/50"
          )}>
            Загрузка...
          </div>
        )}

        {!loading && comments.length === 0 && (
          <div className={cn(
            "text-[13px] text-center py-2",
            theme === 'light' ? "text-gray-400" : "text-muted-foreground/50"
          )}>
            Комментариев пока нет
          </div>
        )}
      </div>

      {/* Jiva typing indicator */}
      <AnimatePresence>
        {jivaTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "flex items-center gap-2 mt-3 px-3 py-2 rounded-lg",
              theme === 'light'
                ? "bg-violet-50 border border-violet-200"
                : "bg-violet-500/10 border border-violet-500/20"
            )}
          >
            <JivaAvatar size={24} />
            <span className="text-[12px] text-muted-foreground flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" />
              Jiva печатает...
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={cn(
              "flex items-center gap-2 mt-3 px-3 py-1.5 rounded-lg text-[12px]",
              isReplyingToJiva
                ? theme === 'light'
                  ? "bg-violet-50 text-violet-600 border border-violet-200"
                  : "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                : theme === 'light'
                  ? "bg-sky-50 text-sky-600"
                  : "bg-sky-500/10 text-sky-400"
            )}
          >
            <ArrowUturnLeftIcon className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">
              Ответ для <strong>{isReplyingToJiva ? 'Jiva' : (replyingTo.author?.display_name || 'Аноним')}</strong>
            </span>
            <button
              onClick={() => setReplyingTo(null)}
              className={cn(
                "ml-auto p-0.5 rounded-full",
                isReplyingToJiva ? "hover:bg-violet-500/20" : "hover:bg-sky-500/20"
              )}
            >
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {user && isRestricted && (
        <div className={cn(
          "flex items-center gap-2 mt-3 px-3 py-2 rounded-lg text-[12px]",
          theme === 'light'
            ? "bg-amber-50 text-amber-600 border border-amber-200"
            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
        )}>
          <ShieldExclamationIcon className="h-4 w-4 flex-shrink-0" />
          <span>
            Комментарии ограничены
            {remainingTime && <span className="opacity-70"> • {remainingTime}</span>}
          </span>
        </div>
      )}

      {user && !isRestricted && (
        <form onSubmit={handleSubmit} className="flex gap-2 mt-3">
          <Avatar className="h-7 w-7 flex-shrink-0">
            <AvatarImage src={typeof user.user_metadata?.avatar_url === 'string' ? user.user_metadata.avatar_url : undefined} />
            <AvatarFallback className={cn(
              "text-[10px] font-medium",
              theme === 'light'
                ? "bg-sky-100 text-sky-600"
                : "bg-primary/20 text-primary"
            )}>
              {(typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.charAt(0)?.toUpperCase() : null) || user.email?.charAt(0)?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 flex gap-1.5">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={
                isReplyingToJiva
                  ? "Ответить Jiva..."
                  : replyingTo
                    ? "Написать ответ..."
                    : "Написать комментарий..."
              }
              className={cn(
                "flex-1 rounded-full px-3 py-1.5 text-[13px] outline-none transition-colors",
                theme === 'light'
                  ? "bg-slate-100 text-gray-900 placeholder:text-gray-400 focus:bg-slate-200"
                  : "bg-white/5 text-foreground placeholder:text-muted-foreground/50 focus:bg-white/10"
              )}
              maxLength={500}
              disabled={submitting || jivaTyping}
            />
            <Button
              type="submit"
              size="sm"
              disabled={!newComment.trim() || submitting || jivaTyping}
              className={cn(
                "rounded-full h-8 w-8 p-0",
                isReplyingToJiva
                  ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
                  : theme === 'light'
                    ? "bg-sky-500 hover:bg-sky-600"
                    : "bg-primary hover:bg-primary/80"
              )}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PaperAirplaneIcon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      )}

      {!user && (
        <div className={cn(
          "text-[13px] text-center py-2 mt-2",
          theme === 'light' ? "text-gray-400" : "text-muted-foreground/50"
        )}>
          Войдите, чтобы оставить комментарий
        </div>
      )}

      <JivaReplyUpsellModal
        open={showUpsellModal}
        onOpenChange={setShowUpsellModal}
        context={upsellContext}
      />

      <CommentReportModal
        commentId={reportingCommentId || ''}
        isOpen={!!reportingCommentId}
        onClose={() => setReportingCommentId(null)}
      />
    </div>
  );
}
