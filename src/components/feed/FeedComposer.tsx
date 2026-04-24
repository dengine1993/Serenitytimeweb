import { useState, useEffect, useRef } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/solid';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { Sun } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/hooks/useI18n';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useHomeTheme } from '@/hooks/useHomeTheme';
import { getTodayInUserTimezone, getHoursUntilMidnight } from '@/lib/dateUtils';

const JOY_PROMPTS = [
  'Улыбнулся прохожему ☀️',
  'Выпил вкусный кофе ☕',
  'Поговорил с близким 💕',
  'Заметил красивое небо 🌤',
  'Закончил дело ✅',
  'Погладил кота 🐈',
];


interface FeedComposerProps {
  onPostCreated?: () => void;
  showDailyLimit?: boolean;
}

export function FeedComposer({ onPostCreated, showDailyLimit = false }: FeedComposerProps) {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const { theme } = useHomeTheme();
  const DRAFT_KEY = 'feed_draft';
  
  // Initialize content from localStorage draft
  const [content, setContent] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(DRAFT_KEY) || '';
    }
    return '';
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dailyPostUsed, setDailyPostUsed] = useState(false);
  const [hoursUntilReset, setHoursUntilReset] = useState(0);
  const [userProfile, setUserProfile] = useState<{ display_name?: string; avatar_url?: string }>();
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Save draft to localStorage
  useEffect(() => {
    if (content.trim()) {
      localStorage.setItem(DRAFT_KEY, content);
    } else {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, [content]);

  // Auto-expand textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, [content]);

  // Load user profile
  useEffect(() => {
    if (!user) return;
    
    const loadProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data) setUserProfile(data);
    };
    
    loadProfile();
  }, [user]);

  // Check daily post limit
  useEffect(() => {
    if (!user || !showDailyLimit) return;

    const checkDailyLimit = async () => {
      // Use user's timezone (default Moscow) for consistent date calculation
      const todayStr = getTodayInUserTimezone();

      const { data } = await supabase
        .from('posts')
        .select('id, created_at')
        .eq('user_id', user.id)
        .gte('created_at', `${todayStr}T00:00:00`)
        .limit(1)
        .single();

      if (data) {
        setDailyPostUsed(true);
        setHoursUntilReset(getHoursUntilMidnight());
      } else {
        setDailyPostUsed(false);
      }
    };

    checkDailyLimit();
  }, [user, showDailyLimit]);

  const handleSubmit = async () => {
    // SECURITY: Check isSubmitting FIRST to prevent race condition
    if (isSubmitting) return;
    
    // Check if user is authenticated
    if (!user) {
      toast.error('Войдите, чтобы написать пост');
      return;
    }
    
    if (loading || !content.trim() || (showDailyLimit && dailyPostUsed)) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Verify session is still valid
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error('Session check failed:', sessionError);
        toast.error('Сессия истекла. Пожалуйста, войдите заново.');
        return;
      }

      console.log('Attempting post insert:', { 
        userId: user.id, 
        contentLength: content.trim().length,
        hasSession: !!session 
      });

      const { data: post, error } = await supabase.from('posts').insert({
        user_id: user.id,
        content: content.trim(),
        emotion: 'light',
      }).select('id, content').single();

      if (error) {
        console.error('Post insert error:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        if (error.code === '23505') {
          // Unique constraint violation (idx_posts_user_daily)
          toast.error('Можно поделиться только одним моментом в день 🌟');
          setDailyPostUsed(true);
          setHoursUntilReset(getHoursUntilMidnight());
        } else if (error.code === '42501') {
          toast.error('Нет прав для публикации. Попробуйте перезайти.');
        } else {
          toast.error('Не удалось опубликовать пост');
        }
        return;
      }

      setContent('');
      localStorage.removeItem(DRAFT_KEY); // Clear draft on success
      if (showDailyLimit) {
        setDailyPostUsed(true);
      }
      toast.success('Радость записана! Спасибо, что поделился ☀️');
      onPostCreated?.();

      // Trigger Jiva auto-comment (fire and forget)
      console.log('[FeedComposer] Calling auto-comment-post for postId:', post.id);
      supabase.functions.invoke('auto-comment-post', {
        body: { 
          postId: post.id, 
          postContent: post.content 
        }
      }).then(({ data, error }) => {
        if (error) {
          console.error('[FeedComposer] Auto-comment failed:', error);
        } else {
          console.log('[FeedComposer] Auto-comment triggered:', data);
        }
      }).catch(err => {
        console.error('[FeedComposer] Auto-comment error:', err);
      });
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error(t('feed.composer.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const MAX_LENGTH = 280;
  const charCount = content.length;
  const canSubmit = content.trim().length > 0 && !isSubmitting && !(showDailyLimit && dailyPostUsed);

  // === "Daily joy already shared" celebratory state ===
  if (showDailyLimit && dailyPostUsed) {
    return (
      <div
        data-feed-composer
        className={cn(
          "px-4 py-4 border-b flex items-center gap-3",
          theme === 'light'
            ? "border-slate-200/80 bg-gradient-to-br from-amber-50 via-orange-50/70 to-rose-50/40"
            : "border-white/5 bg-gradient-to-br from-amber-500/[0.07] via-orange-500/[0.04] to-transparent"
        )}
      >
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
          theme === 'light'
            ? "bg-amber-100 text-amber-600"
            : "bg-amber-500/15 text-amber-400"
        )}>
          <Sun className="w-5 h-5" strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-[14px] font-semibold leading-tight",
            theme === 'light' ? "text-amber-900" : "text-amber-200/95"
          )}>
            Радость дня записана ✨
          </p>
          <p className={cn(
            "text-[12px] leading-snug mt-0.5",
            theme === 'light' ? "text-amber-700/75" : "text-amber-200/55"
          )}>
            Возвращайся завтра за новым моментом
            {hoursUntilReset > 0 ? ` · через ~${hoursUntilReset}ч` : ''}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      data-feed-composer
      className={cn(
        "px-4 py-3 transition-all duration-200 border-b",
        theme === 'light'
          ? "border-slate-200/80 bg-white/50"
          : "border-white/5 bg-white/[0.01]"
      )}
    >
      <div className="flex gap-3">
        {/* User Avatar */}
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={userProfile?.avatar_url} />
          <AvatarFallback className={cn(
            "text-sm font-medium",
            theme === 'light' 
              ? "bg-amber-100 text-amber-600" 
              : "bg-amber-500/15 text-amber-400"
          )}>
            {userProfile?.display_name?.charAt(0)?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>

        {/* Input area */}
        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, MAX_LENGTH))}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="Что хорошего случилось сегодня? ☀️"
            rows={1}
            className={cn(
              "w-full resize-none bg-transparent border-0 text-[15px] leading-[1.4] placeholder:text-muted-foreground/55 focus:outline-none py-2",
              theme === 'light' ? "text-gray-900" : "text-foreground"
            )}
            disabled={isSubmitting}
          />

          {/* Prompt chips — shown when empty & not focused (lowers blank-page friction) */}
          {!isFocused && content.length === 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1 pb-1">
              {JOY_PROMPTS.slice(0, 3).map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    setContent(prompt);
                    setTimeout(() => textareaRef.current?.focus(), 0);
                  }}
                  className={cn(
                    "text-[12px] px-2.5 py-1 rounded-full transition-colors",
                    theme === 'light'
                      ? "bg-amber-50 text-amber-700 border border-amber-200/70 hover:bg-amber-100"
                      : "bg-amber-500/10 text-amber-300/90 border border-amber-500/20 hover:bg-amber-500/15"
                  )}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Footer row - only show when focused or has content */}
          {(isFocused || content.length > 0) && (
            <div className="flex items-center justify-between pt-2 mt-2 border-t border-white/5">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-xs tabular-nums",
                  charCount > MAX_LENGTH * 0.9 
                    ? "text-amber-500" 
                    : theme === 'light' ? "text-gray-400" : "text-muted-foreground/50"
                )}>
                  {charCount}/{MAX_LENGTH}
                </span>
                <span className={cn(
                  "text-[11px] hidden sm:inline",
                  theme === 'light' ? "text-amber-700/60" : "text-amber-300/50"
                )}>
                  · Один момент в день. Завтра — снова ✨
                </span>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-full transition-all",
                  canSubmit
                    ? "bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30 hover:shadow-amber-500/50"
                    : theme === 'light' 
                      ? "bg-slate-100 text-slate-400" 
                      : "bg-white/5 text-muted-foreground/30"
                )}
                aria-label="Поделиться радостью"
              >
                {isSubmitting ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <PaperAirplaneIcon className="h-4 w-4" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}