import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePremiumStatus } from '@/hooks/useEntitlements';
import { useCommunityRestriction } from '@/hooks/useCommunityRestriction';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useI18n } from '@/hooks/useI18n';
import { toast } from 'sonner';
import { useHomeTheme } from '@/hooks/useHomeTheme';
import { PaperAirplaneIcon, TrashIcon, ArrowUturnLeftIcon, XMarkIcon, ShieldExclamationIcon, FlagIcon, PencilIcon } from '@heroicons/react/24/solid';
import { InlineCommentEditor } from '@/components/comments/InlineCommentEditor';
import Twemoji from 'react-twemoji';
import { JivaReplyUpsellModal } from './JivaReplyUpsellModal';
import { JIVA_REPLY_LIMITS } from '@/config/jivaLimits';

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
  edited_at?: string | null;
  parent_id: string | null;
  is_jiva?: boolean;
  author?: {
    user_id?: string;
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

// Reusable Jiva avatar with violet glow.
// ring-inset keeps the violet ring inside the element bounds so it isn't
// clipped by parent containers. A modest shadow gives glow without bleeding
// far outside the avatar's box.
function JivaAvatar({ size = 28 }: { size?: number }) {
  return (
    <div
      className="relative flex-shrink-0 rounded-full overflow-hidden ring-2 ring-inset ring-violet-300/50 shadow-[0_0_8px_rgba(167,139,250,0.45)]"
      style={{ width: size, height: size }}
    >
      <img
        src={jivaLogo}
        alt="Jiva"
        className="h-full w-full rounded-full object-cover"
      />
    </div>
  );
}

export function PostComments({ postId, postAuthorId, postContent, onCountChange }: PostCommentsProps) {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const { isPremium, loading: premiumLoading } = usePremiumStatus();
  const { isRestricted, remainingTime } = useCommunityRestriction();
  const { t, language } = useI18n();
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
        .maybeSingle();

      const used = data?.daily_count || 0;
      const remaining = Math.max(0, JIVA_REPLY_LIMITS.premiumDailyLimit - used);
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
          setTrialCompleted(usedCount >= JIVA_REPLY_LIMITS.freeTrialLimit);
          setTrialAvailable(usedCount < JIVA_REPLY_LIMITS.freeTrialLimit);
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
      author: profilesMap.get(comment.user_id) || { user_id: comment.user_id }
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
        event: 'UPDATE',
        schema: 'public',
        table: 'post_comments',
        filter: `post_id=eq.${postId}`
      }, (payload) => {
        const u = payload.new as { id: string; content: string; edited_at?: string };
        setComments(prev => prev.map(c => c.id === u.id ? { ...c, content: u.content, edited_at: u.edited_at } : c));
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
        const hasTrialReplies = trialPostId === null || (trialPostId === postId && trialRepliesUsed < JIVA_REPLY_LIMITS.freeTrialLimit);

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
          `${SUPABASE_URL}/functions/v1/reply-to-jiva`,
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
            toast.error(t('feed.comments.jivaLimitReached'));
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
          if (data.code === 'NOT_POST_AUTHOR') {
            toast.error(t('feed.comments.jivaOnlyAuthor', { defaultValue: 'Отвечать Дживе может только автор поста' }));
            setReplyingTo(null);
            return;
          }
          throw new Error(data.error || 'Failed to reply');
        }

        if (typeof data.remaining === 'number') {
          if (isPremium) {
            setJivaRepliesRemaining(data.remaining);
            setDailyLimitReached(data.remaining === 0);
          } else {
            setTrialRepliesUsed(JIVA_REPLY_LIMITS.freeTrialLimit - data.remaining);
            setTrialPostId(postId);
            setTrialAvailable(data.remaining > 0);

            if (data.trialCompleted) {
              setTrialCompleted(true);
              toast(t('feed.comments.trialCompleted', { limit: JIVA_REPLY_LIMITS.premiumDailyLimit }), {
                duration: 5000,
              });
            } else {
              toast(t('feed.comments.trialReplied', { remaining: data.remaining, total: JIVA_REPLY_LIMITS.freeTrialLimit }), {
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
        toast.error(t('feed.comments.sendFail'));
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

        // Push to post owner (skip self and Jiva-bot reply targets handled elsewhere)
        if (postAuthorId && postAuthorId !== user.id) {
          supabase.functions.invoke('notify-event', {
            body: { type: 'reply_to_post', recipient_id: postAuthorId, post_id: postId, preview: newComment.trim().slice(0, 140) },
          }).catch(() => undefined);
        }

        setNewComment('');
        setReplyingTo(null);
        fetchComments();
      } catch (error) {
        console.error('Error adding comment:', error);
        toast.error(t('feed.comments.addFail'));
      } finally {
        setSubmitting(false);
      }
    }
  };

  const { isAdmin } = useIsAdmin();

  const handleDelete = async (commentId: string, commentAuthorId: string) => {
    if (!user) return;

    if (commentAuthorId !== user.id && !isAdmin) {
      toast.error(t('feed.comments.deleteNoRights'));
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
      toast.error(t('feed.comments.deleteFail'));
    }
  };

  const handleEdit = async (commentId: string, newContent: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('post_comments')
        .update({ content: newContent })
        .eq('id', commentId)
        .eq('user_id', user.id);
      if (error) throw error;
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, content: newContent, edited_at: new Date().toISOString() } : c));
    } catch (e) {
      console.error('Error editing comment:', e);
      toast.error(t('common.error'));
    }
  };

  const handleReplyClick = (comment: Comment) => {
    const isJiva = comment.is_jiva || comment.user_id === JIVA_BOT_USER_ID;
    const isPostAuthor = user?.id === postAuthorId;

    if (isJiva && !isPostAuthor) return;

    if (isJiva) {
      if (isPremium) {
        if (dailyLimitReached) {
          toast.error(t('feed.comments.jivaLimitReachedFull', { used: JIVA_REPLY_LIMITS.premiumDailyLimit, limit: JIVA_REPLY_LIMITS.premiumDailyLimit }));
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

    if (diffMins < 1) return t('feed.post.now');
    if (diffMins < 60) return t('feed.post.minutes', { n: diffMins });
    if (diffHours < 24) return t('feed.post.hours', { n: diffHours });
    if (diffDays < 7) return t('feed.post.days', { n: diffDays });
    return date.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short' });
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
    const [isEditing, setIsEditing] = useState(false);
    const isJiva = comment.is_jiva || comment.user_id === JIVA_BOT_USER_ID;
    const isPostAuthor = user?.id === postAuthorId;
    const canReplyToJiva = isJiva && isPostAuthor && user;
    const isMine = !isJiva && user?.id === comment.user_id;

    const hasTrialAvailable = !isPremium && isPostAuthor && (trialPostId === null || (trialPostId === postId && !trialCompleted));
    const isTrialBlocked = !isPremium && isPostAuthor && ((trialPostId !== null && trialPostId !== postId) || trialCompleted);

    const parentIsJiva = comment.parentComment?.is_jiva || comment.parentComment?.user_id === JIVA_BOT_USER_ID;

    const MAX_LENGTH = 200;
    const isLongComment = comment.content.length > MAX_LENGTH;
    const displayContent = isLongComment && !isExpanded
      ? comment.content.slice(0, MAX_LENGTH) + "..."
      : comment.content;

    const authorName = isJiva ? 'Jiva' : (comment.author?.display_name || '—');

    const avatarEl = isJiva ? (
      <JivaAvatar size={28} />
    ) : comment.user_id === CEO_USER_ID ? (
      <CEOAvatar size="sm" avatarUrl={comment.author?.avatar_url} />
    ) : (
      <Avatar className="h-7 w-7 flex-shrink-0">
        {comment.author?.avatar_url ? <AvatarImage src={comment.author.avatar_url} /> : null}
        <AvatarFallback
          className={cn(
            "text-[10px] font-medium",
            theme === 'light'
              ? "bg-sky-100 text-sky-600"
              : "bg-primary/20 text-primary"
          )}
        >
          {comment.author?.display_name?.charAt(0)?.toUpperCase() || '?'}
        </AvatarFallback>
      </Avatar>
    );

    return (
      <div
        id={`comment-${comment.id}`}
        className={cn(
          "transition-all duration-300 rounded-lg",
          comment.parentComment && (
            theme === 'light'
              ? "ml-9 pl-3 border-l border-slate-200/70"
              : "ml-9 pl-3 border-l border-white/10"
          )
        )}
      >
        <motion.div
          layout
          initial={false}
          animate={{ opacity: 1 }}
          className={cn(
            "flex gap-2 group",
            isMine && "flex-row-reverse"
          )}
        >
          {avatarEl}

          <div className={cn(
            "min-w-0 flex flex-col max-w-[calc(100%-2.75rem)]",
            isMine ? "items-end ml-auto" : "items-start"
          )}>
            {/* Header ABOVE the bubble — natural order both sides */}
            <div className={cn(
              "flex items-center gap-1.5 mb-1 px-1 max-w-full",
              isMine && "justify-end"
            )}>
              {isJiva ? (
                <span className="text-[12px] font-semibold truncate text-violet-600 dark:text-violet-300">
                  {authorName}
                </span>
              ) : (
                <span
                  className={cn(
                    "text-[12px] font-semibold truncate text-left",
                    isMine
                      ? theme === 'light' ? "text-sky-700" : "text-sky-300"
                      : theme === 'light' ? "text-gray-800" : "text-foreground/90"
                  )}
                >
                  {authorName}
                </span>
              )}
              {isJiva && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-medium leading-none flex-shrink-0">
                  AI
                </span>
              )}
              {!isJiva && comment.user_id === CEO_USER_ID && <CEOBadge />}
              <span className={cn(
                "text-[10px] flex-shrink-0",
                theme === 'light' ? "text-gray-400" : "text-muted-foreground/50"
              )}>
                · {formatTime(comment.created_at)}{comment.edited_at ? ` · ${t('common.edited')}` : ''}
              </span>
            </div>

            {/* Bubble */}
            <div className={cn(
              "rounded-2xl px-3 py-2 max-w-full",
              isMine ? "rounded-tr-md" : "rounded-tl-md",
              isJiva
                ? "bg-violet-500/[0.08] dark:bg-violet-500/[0.14] ring-1 ring-violet-500/20 dark:ring-violet-400/25 text-foreground"
                : isMine
                  ? theme === 'light'
                    ? "bg-sky-100 ring-1 ring-sky-200 text-sky-950"
                    : "bg-sky-500/20 ring-1 ring-sky-400/30 text-sky-50"
                  : theme === 'light'
                    ? "bg-slate-100 text-slate-900"
                    : "bg-white/[0.07] ring-1 ring-white/10 text-foreground"
            )}>
              {/* Telegram-style quote */}
              {comment.parentComment && (
                <button
                  onClick={() => scrollToComment(comment.parentComment!.id)}
                  className={cn(
                    "block w-full text-left mb-1.5 pl-2 border-l-2 transition-opacity hover:opacity-80",
                    parentIsJiva
                      ? "border-violet-500"
                      : "border-sky-400 dark:border-sky-400/70"
                  )}
                >
                  <span className={cn(
                    "block text-[11px] font-semibold leading-tight",
                    parentIsJiva ? "text-violet-500 dark:text-violet-300" : "text-sky-500 dark:text-sky-300"
                  )}>
                   {parentIsJiva ? 'Jiva' : (comment.parentComment.author?.display_name || '—')}
                  </span>
                  <span className={cn(
                    "block text-[11px] leading-tight truncate",
                    theme === 'light' ? "text-gray-500" : "text-muted-foreground/70"
                  )}>
                    {comment.parentComment.content}
                  </span>
                </button>
              )}

              {isEditing ? (
                <InlineCommentEditor
                  initialValue={comment.content}
                  maxLength={500}
                  onSave={async (text) => { await handleEdit(comment.id, text); setIsEditing(false); }}
                  onCancel={() => setIsEditing(false)}
                />
              ) : (
                <>
                  <Twemoji options={{ className: 'twemoji-inline' }}>
                    <p className={cn(
                      "text-[13.5px] leading-[1.4] break-words",
                      isJiva
                        ? "text-foreground/90"
                        : theme === 'light' ? "text-gray-800" : "text-foreground/90"
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
                      {isExpanded ? t('feed.comments.collapse') : t('feed.comments.expand')}
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Actions under bubble */}
            <div className={cn(
              "flex items-center gap-3 mt-1 px-1",
              isMine && "flex-row-reverse"
            )}>
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
                        : "text-muted-foreground/60 hover:text-sky-400"
                  )}
                >
                  <ArrowUturnLeftIcon className="h-3 w-3" />
                  <span>{t('feed.comments.reply')}</span>
                  {isJiva && !isPremium && hasTrialAvailable && trialPostId === null && (
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full ml-0.5">
                      {t('feed.comments.trial')}
                    </span>
                  )}
                </button>
              )}

              {isMine && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className={cn(
                    "md:opacity-0 md:group-hover:opacity-100 opacity-40 transition-opacity",
                    "p-1 -m-1 rounded-full hover:bg-primary/10",
                    theme === 'light' ? "text-gray-400 hover:text-sky-500" : "text-muted-foreground/50 hover:text-sky-400"
                  )}
                  aria-label={t('common.edit')}
                >
                  <PencilIcon className="h-3 w-3" />
                </button>
              )}

              {(user?.id === comment.user_id || isAdmin) && !isEditing && (
                <button
                  onClick={() => handleDelete(comment.id, comment.user_id)}
                  className={cn(
                    "md:opacity-0 md:group-hover:opacity-100 opacity-40 transition-opacity",
                    "p-1 -m-1 rounded-full hover:bg-red-500/10",
                    theme === 'light' ? "text-gray-400 hover:text-red-500" : "text-muted-foreground/50 hover:text-red-400"
                  )}
                  aria-label={t('feed.comments.delete')}
                >
                  <TrashIcon className="h-3 w-3" />
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
      "mt-3 pt-3 border-t px-0.5",
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
            {t('feed.comments.loading')}
          </div>
        )}

        {!loading && comments.length === 0 && (
          <div className={cn(
            "text-[13px] text-center py-2",
            theme === 'light' ? "text-gray-400" : "text-muted-foreground/50"
          )}>
            {t('feed.comments.empty')}
          </div>
        )}
      </div>

      {/* Jiva typing indicator — inline as next bubble (Telegram-style) */}
      <AnimatePresence>
        {jivaTyping && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex gap-2 mt-2 items-end"
          >
            <JivaAvatar size={28} />
            <div className={cn(
              "inline-flex items-center gap-1 rounded-2xl rounded-tl-md px-3 py-2.5",
              "bg-violet-500/8 dark:bg-violet-500/12 ring-1 ring-violet-500/15 dark:ring-violet-400/20"
            )}>
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="block w-1.5 h-1.5 rounded-full bg-violet-500/70 dark:bg-violet-300/80"
                  animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.18,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {user && isRestricted && (
        <div className={cn(
          "flex items-center gap-2 mt-3 px-3 py-2 rounded-2xl text-[12px]",
          theme === 'light'
            ? "bg-amber-50 text-amber-600 border border-amber-200"
            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
        )}>
          <ShieldExclamationIcon className="h-4 w-4 flex-shrink-0" />
          <span>
            {t('feed.comments.restricted')}
            {remainingTime && <span className="opacity-70"> • {remainingTime}</span>}
          </span>
        </div>
      )}

      {user && !isRestricted && (
        <form onSubmit={handleSubmit} className="mt-3">
          {/* Composer container — reply preview + input fused into one card */}
          <div className={cn(
            "rounded-2xl overflow-hidden transition-colors",
            theme === 'light'
              ? "bg-slate-100 ring-1 ring-slate-200/80 focus-within:ring-slate-300"
              : "bg-white/5 ring-1 ring-white/10 focus-within:ring-white/20"
          )}>
            {/* Reply preview — Telegram style, glued to the input */}
            <AnimatePresence initial={false}>
              {replyingTo && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className={cn(
                    "flex items-start gap-2 px-3 pt-2.5 pb-2",
                    theme === 'light' ? "border-b border-slate-200/80" : "border-b border-white/8"
                  )}>
                    <div className={cn(
                      "flex-1 min-w-0 pl-2 border-l-2",
                      isReplyingToJiva
                        ? "border-violet-500"
                        : "border-sky-400 dark:border-sky-400/70"
                    )}>
                      <div className={cn(
                        "text-[11px] font-semibold leading-tight",
                        isReplyingToJiva
                          ? "text-violet-500 dark:text-violet-300"
                          : "text-sky-500 dark:text-sky-300"
                      )}>
                        {isReplyingToJiva ? 'Jiva' : (replyingTo.author?.display_name || '—')}
                      </div>
                      <div className={cn(
                        "text-[11px] leading-tight truncate mt-0.5",
                        theme === 'light' ? "text-gray-500" : "text-muted-foreground/70"
                      )}>
                        {replyingTo.content}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className={cn(
                        "p-1 -m-1 rounded-full flex-shrink-0",
                        theme === 'light' ? "hover:bg-slate-200 text-gray-500" : "hover:bg-white/10 text-muted-foreground"
                      )}
                      aria-label={t('feed.comments.cancelReply')}
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Premium quota hint when replying to Jiva */}
            {isReplyingToJiva && isPremium && jivaRepliesRemaining !== null && (
              <div className={cn(
                "px-3 py-1.5 text-[11px] flex items-center gap-1.5",
                theme === 'light' ? "border-b border-slate-200/80" : "border-b border-white/8",
                jivaRepliesRemaining === 0
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-violet-600/80 dark:text-violet-300/80"
              )}>
                <span>
                  {jivaRepliesRemaining === 0
                    ? t('feed.comments.jivaQuotaExhausted', { limit: JIVA_REPLY_LIMITS.premiumDailyLimit })
                    : t('feed.comments.jivaQuotaRemaining', { remaining: jivaRepliesRemaining, limit: JIVA_REPLY_LIMITS.premiumDailyLimit })}
                </span>
              </div>
            )}


            {/* Input row */}
            <div className="flex items-end gap-1 px-2 py-1.5">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={
                  isReplyingToJiva
                    ? t('feed.comments.placeholderJiva')
                    : replyingTo
                      ? t('feed.comments.placeholderReply')
                      : t('feed.comments.placeholder')
                }
                className={cn(
                  "flex-1 bg-transparent px-2 py-2 text-[14px] outline-none",
                  theme === 'light'
                    ? "text-gray-900 placeholder:text-gray-400"
                    : "text-foreground placeholder:text-muted-foreground/50"
                )}
                maxLength={500}
                disabled={submitting || jivaTyping}
              />
              <Button
                type="submit"
                size="sm"
                disabled={!newComment.trim() || submitting || jivaTyping}
                className={cn(
                  "rounded-full h-9 w-9 p-0 flex-shrink-0 shadow-sm",
                  isReplyingToJiva
                    ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
                    : theme === 'light'
                      ? "bg-sky-500 hover:bg-sky-600"
                      : "bg-primary hover:bg-primary/80"
                )}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PaperAirplaneIcon className="h-4 w-4 -rotate-0" />
                )}
              </Button>
            </div>
          </div>
        </form>
      )}

      {!user && (
        <div className={cn(
          "text-[13px] text-center py-2 mt-2",
          theme === 'light' ? "text-gray-400" : "text-muted-foreground/50"
        )}>
          {t('feed.comments.authRequired')}
        </div>
      )}

      <JivaReplyUpsellModal
        open={showUpsellModal}
        onOpenChange={setShowUpsellModal}
        context={upsellContext}
      />

    </div>
  );
}
