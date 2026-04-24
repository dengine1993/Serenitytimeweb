import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { motion } from 'framer-motion';
import { useHomeTheme } from '@/hooks/useHomeTheme';
import { cn } from '@/lib/utils';

interface GlimmerBlockProps {
  hasPosted: boolean;
  postContent?: string;
  aiResponse?: string;
  onSubmit: (content: string) => void;
}

export function GlimmerBlock({ hasPosted, postContent, aiResponse, onSubmit }: GlimmerBlockProps) {
  const { theme } = useHomeTheme();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (content.trim()) {
      setIsSubmitting(true);
      await onSubmit(content);
      setContent('');
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "rounded-2xl p-6 space-y-4 relative overflow-hidden group hover:scale-[1.01] transition-all duration-500 gpu-accelerated",
        theme === 'light'
          ? "bg-white/80 border border-amber-200/60 shadow-sm"
          : "glass-card"
      )}
      role="region"
      aria-label="Светлый момент дня"
    >
      {/* Subtle background accent */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber/0 to-amber/0 group-hover:from-amber/5 group-hover:to-amber/10 transition-all duration-700 rounded-2xl" />
      
      {/* Glow effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-2xl blur-2xl bg-amber/10" />
      
      <div className="flex items-center justify-between relative z-10">
        <div>
          <h2 className={cn(
            "text-sm font-medium",
            theme === 'light' ? "text-slate-800" : "text-foreground"
          )}>
            Светлый момент
          </h2>
          <p className={cn(
            "text-xs mt-0.5",
            theme === 'light' ? "text-slate-500" : "text-muted-foreground/70"
          )}>
            Запиши что-то хорошее из сегодня
          </p>
        </div>
        {!hasPosted && (
          <span className={cn(
            "text-xs px-2 py-1 rounded-full",
            theme === 'light' ? "text-slate-400 bg-slate-100" : "text-muted-foreground/40 bg-white/5"
          )}>
            1 в день
          </span>
        )}
      </div>

      {!hasPosted ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="relative z-10"
        >
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Что согрело тебя сегодня? (Кофе, луч солнца, тишина...)"
              className={cn(
                "min-h-[100px] resize-none transition-colors duration-300 pr-12",
                theme === 'light'
                  ? "bg-slate-50/50 border-slate-200 focus:border-amber-300 text-slate-800 placeholder:text-slate-400"
                  : "bg-background/30 border-border/50 focus:border-amber/50"
              )}
              disabled={isSubmitting}
              aria-label="Напишите что-то хорошее из сегодняшнего дня"
              maxLength={500}
            />
          <motion.button
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            className={cn(
              "absolute right-3 bottom-3 p-2 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber focus:ring-offset-2",
              theme === 'light'
                ? "bg-amber-100 hover:bg-amber-200 focus:ring-offset-white"
                : "bg-white/10 hover:bg-white/20 focus:ring-offset-background/50"
            )}
            aria-label="Сохранить светлый момент"
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            type="button"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5 text-amber" style={{ filter: 'drop-shadow(0 0 8px hsl(var(--amber-glow)))' }} />
            )}
          </motion.button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4 relative z-10"
        >
          <blockquote className="text-foreground/90 italic border-l-2 border-primary/50 pl-4 transition-colors duration-300">
            "{postContent}"
          </blockquote>
          
          {aiResponse && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex gap-2 items-start pt-2"
            >
              <Sparkles className="w-4 h-4 text-amber flex-shrink-0 mt-1" />
              <p className="text-sm text-muted-foreground/90 italic">
                {aiResponse}
              </p>
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
