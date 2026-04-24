import { Flame } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { useHomeTheme } from '@/hooks/useHomeTheme';
import { cn } from '@/lib/utils';
import { useMoodEntries } from '@/hooks/useMoodEntries';

export function StreakWidget() {
  const { user } = useAuth();
  const { theme } = useHomeTheme();
  const { stats, loading } = useMoodEntries();
  const streak = stats.streak;

  if (loading) {
    return (
      <div className={cn(
        "rounded-2xl p-3 animate-pulse",
        theme === 'light'
          ? "bg-white/80 border-2 border-amber-200/60 shadow-sm"
          : "bg-gradient-to-br from-amber/10 to-amber/5 backdrop-blur-lg border-2 border-amber/30"
      )}>
        <div className="flex items-start gap-2.5">
          <div className={cn(
            "p-1.5 rounded-lg",
            theme === 'light' ? "bg-amber-100" : "bg-amber/15"
          )}>
            <Flame className="h-4 w-4 text-amber-500 opacity-50" />
          </div>
          <div className="flex-1 space-y-2">
            <div className={cn("h-3 rounded w-16", theme === 'light' ? "bg-amber-100" : "bg-amber/10")} />
            <div className={cn("h-2 rounded w-24", theme === 'light' ? "bg-amber-100" : "bg-amber/10")} />
          </div>
        </div>
      </div>
    );
  }

  if (streak === 0) {
    // Empty state - encourage starting streak
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "rounded-2xl p-3 cursor-pointer transition-all duration-300 group",
          theme === 'light'
            ? "bg-white/80 border-2 border-amber-200/60 shadow-sm hover:border-amber-300/80 hover:shadow-md"
            : "bg-gradient-to-br from-amber/10 to-amber/5 backdrop-blur-lg border-2 border-amber/30 hover:border-amber/50"
        )}
        onClick={() => {
          const composer = document.querySelector('[data-feed-composer]');
          const textarea = composer?.querySelector('textarea');
          composer?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => textarea?.focus(), 300);
        }}
      >
        <div className="flex items-start gap-2.5">
          <div className={cn(
            "p-1.5 rounded-lg transition-colors",
            theme === 'light' 
              ? "bg-amber-100 group-hover:bg-amber-200" 
              : "bg-amber/15 group-hover:bg-amber/25"
          )}>
            <Flame className="h-4 w-4 text-amber-500" aria-label="Огонь серии" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className={cn(
              "text-xs font-medium mb-1",
              theme === 'light' ? "text-slate-800" : "text-foreground"
            )}>
              Серия
            </h4>
            <p className={cn(
              "text-xs mb-1.5 line-clamp-2 leading-relaxed",
              theme === 'light' ? "text-slate-600" : "text-muted-foreground/90"
            )}>
              Начни записывать моменты каждый день
            </p>
            <span className="text-xs text-amber-500 group-hover:text-amber-600 transition-colors">
              Написать сейчас ↓
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl p-3 transition-all duration-300",
        theme === 'light'
          ? "bg-white/80 border-2 border-amber-200/60 shadow-sm hover:border-amber-300/80 hover:shadow-md"
          : "bg-gradient-to-br from-amber/10 to-amber/5 backdrop-blur-lg border-2 border-amber/30 hover:border-amber/50"
      )}
    >
      <div className="flex items-start gap-2.5">
        <motion.div 
          className={cn(
            "p-1.5 rounded-lg",
            theme === 'light' ? "bg-amber-100" : "bg-amber/15"
          )}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Flame className="h-4 w-4 text-amber-500" aria-label="Огонь серии" />
        </motion.div>
        
        <div className="flex-1 min-w-0">
          <h4 className={cn(
            "text-xs font-medium mb-1.5",
            theme === 'light' ? "text-slate-500" : "text-muted-foreground/90"
          )}>
            Серия
          </h4>
          
          <div className="flex items-baseline gap-1.5 mb-1.5">
            <span className={cn(
              "text-2xl font-bold",
              theme === 'light' ? "text-slate-800" : "text-foreground"
            )}>{streak}</span>
            <span className={cn(
              "text-xs",
              theme === 'light' ? "text-slate-500" : "text-muted-foreground/90"
            )}>
              {streak === 1 ? 'день' : streak < 5 ? 'дня' : 'дней'}
            </span>
          </div>

          <p className={cn(
            "text-xs leading-relaxed",
            theme === 'light' ? "text-slate-500" : "text-muted-foreground/90"
          )}>
            {streak === 0 
              ? 'Начни записывать моменты каждый день'
              : 'Продолжай в том же духе! 🔥'
            }
          </p>
        </div>
      </div>
    </motion.div>
  );
}
