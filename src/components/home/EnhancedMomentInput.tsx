import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Send, Smile, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useHomeTheme } from '@/hooks/useHomeTheme';
import { getTodayInUserTimezone, getHoursUntilMidnight } from '@/lib/dateUtils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface EnhancedMomentInputProps {
  onPostCreated?: () => void;
}

const EXAMPLE_PROMPTS = [
  'Сегодня улыбнулся прохожему ☀️',
  'Выпила вкусный кофе ☕',
  'Погуляла с собакой 🐕',
  'Позвонила маме 💕',
  'Закончила важное дело ✅',
];

const EMOJIS = ['😊', '🌟', '💪', '🌸', '☀️', '🌈', '💚', '✨', '🦋', '🌻', '🙏', '❤️'];

export function EnhancedMomentInput({ onPostCreated }: EnhancedMomentInputProps) {
  const { user } = useAuth();
  const { theme } = useHomeTheme();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasPostedToday, setHasPostedToday] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [hoursUntilReset, setHoursUntilReset] = useState(0);

  // Check daily limit
  useEffect(() => {
    const checkDailyLimit = async () => {
      if (!user) {
        setIsChecking(false);
        return;
      }

      // Use user's timezone for consistent date calculation
      const todayStr = getTodayInUserTimezone();

      const { count } = await supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', `${todayStr}T00:00:00`);

      setHasPostedToday((count || 0) > 0);
      setHoursUntilReset(getHoursUntilMidnight());
      
      setIsChecking(false);
    };

    checkDailyLimit();
  }, [user]);

  const handleSubmit = async () => {
    // SECURITY: Check isSubmitting FIRST to prevent race condition
    if (isSubmitting) return;
    
    if (!user) {
      toast.error('Войдите, чтобы поделиться моментом');
      return;
    }

    if (!content.trim()) {
      toast.error('Напишите что-нибудь хорошее 😊');
      return;
    }

    if (hasPostedToday) {
      toast.error('Можно поделиться только одним моментом в день');
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        content: content.trim()
      });

    if (error) {
      console.error('Post insert error:', error);
      if (error.code === '23505') {
        // Unique constraint violation (idx_posts_user_daily)
        toast.error('Можно поделиться только одним моментом в день 🌟');
        setHasPostedToday(true);
        setHoursUntilReset(getHoursUntilMidnight());
      } else if (error.code === '42501') {
        toast.error('Нет прав для публикации. Попробуйте перезайти.');
      } else {
        toast.error('Не удалось опубликовать');
      }
      setIsSubmitting(false);
      return;
    }

    toast.success('Момент опубликован! ✨');
    setContent('');
    setHasPostedToday(true);
    onPostCreated?.();
    setIsSubmitting(false);
  };

  const addEmoji = (emoji: string) => {
    setContent(prev => prev + emoji);
  };

  const randomPrompt = EXAMPLE_PROMPTS[Math.floor(Math.random() * EXAMPLE_PROMPTS.length)];

  if (isChecking) {
    return (
      <Card className={cn(
        "p-6 rounded-3xl animate-pulse",
        theme === 'light' 
          ? "bg-gradient-to-br from-amber-50 to-orange-50" 
          : "bg-card/50"
      )}>
        <div className="h-32 bg-muted/20 rounded-2xl" />
      </Card>
    );
  }

  if (hasPostedToday) {
    return (
      <Card 
        id="moment-input"
        className={cn(
          "p-6 rounded-3xl border-2 border-dashed",
          theme === 'light' 
            ? "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200" 
            : "bg-emerald-500/10 border-emerald-500/30"
        )}
      >
        <div className="text-center py-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center"
          >
            <Sparkles className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </motion.div>
          <h3 className={cn(
            "font-semibold text-lg mb-2",
            theme === 'light' ? "text-emerald-800" : "text-emerald-400"
          )}>
            Ты уже поделился сегодня! 🌟
          </h3>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Следующий момент через ~{hoursUntilReset} ч</span>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      id="moment-input"
      className={cn(
        "p-6 rounded-3xl overflow-hidden relative",
        theme === 'light' 
          ? "bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 shadow-xl shadow-amber-100/50" 
          : "bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20"
      )}
    >
      {/* Decorative sparkles */}
      <div className="absolute top-4 right-4 text-amber-400/30">
        <Sparkles className="h-6 w-6" />
      </div>

      <div className="relative">
        <label className={cn(
          "block text-sm font-medium mb-3",
          theme === 'light' ? "text-amber-800" : "text-amber-400"
        )}>
          ✨ Момент дня
        </label>

        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, 280))}
          placeholder="Самое тёплое событие сегодня... 😊"
          className={cn(
            "min-h-[100px] text-base resize-none border-0 rounded-2xl mb-3",
            theme === 'light' 
              ? "bg-white/70 placeholder:text-amber-400/60" 
              : "bg-background/50 placeholder:text-muted-foreground/50"
          )}
        />

        {/* Example prompt */}
        <p className={cn(
          "text-xs mb-4",
          theme === 'light' ? "text-amber-600/70" : "text-muted-foreground"
        )}>
          Например: {randomPrompt}
        </p>

        <div className="flex items-center justify-between">
          {/* Emoji picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "gap-2 rounded-xl",
                  theme === 'light' ? "text-amber-600 hover:bg-amber-100" : ""
                )}
              >
                <Smile className="h-4 w-4" />
                <span className="text-xs">Эмодзи</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3 rounded-2xl" side="top">
              <div className="grid grid-cols-6 gap-1">
                {EMOJIS.map((emoji) => (
                  <motion.button
                    key={emoji}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => addEmoji(emoji)}
                    className="text-xl p-1.5 rounded-lg hover:bg-accent"
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-3">
            <span className={cn(
              "text-xs",
              content.length > 250 ? "text-amber-600" : "text-muted-foreground"
            )}>
              {content.length}/280
            </span>

            <Button
              onClick={handleSubmit}
              disabled={!content.trim() || isSubmitting}
              className={cn(
                "rounded-2xl px-6 gap-2 font-semibold",
                "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600",
                "text-white shadow-lg shadow-amber-500/30"
              )}
            >
              {isSubmitting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1 }}
                >
                  <Sparkles className="h-4 w-4" />
                </motion.div>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Поделиться
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
