import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FireIcon, SparklesIcon } from '@heroicons/react/24/solid';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { useHomeTheme } from '@/hooks/useHomeTheme';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useMoodEntries } from '@/hooks/useMoodEntries';

const encouragements = [
  "Горжусь тобой! Ты рядом с собой 💙",
  "Каждый день — маленький восход 🌅",
  "Ты возвращаешься — это уже много 🌟",
  "Смотри, как далеко ты зашёл 🔥",
  "Ты сильнее, чем думаешь 💪",
];

export function EnhancedStreakWidget() {
  const { user } = useAuth();
  const { theme } = useHomeTheme();
  const navigate = useNavigate();
  const { stats, loading: moodLoading } = useMoodEntries();
  const streak = stats.streak;
  const loading = moodLoading;

  const streakMessage = useMemo(() => {
    if (streak > 0) {
      return encouragements[streak % encouragements.length];
    }
    return '';
  }, [streak]);


  // Calculate progress for circle (max 30 days for full circle)
  const maxDays = 30;
  const progress = Math.min(streak / maxDays, 1);
  const circumference = 2 * Math.PI * 36; // radius = 36
  const strokeDashoffset = circumference * (1 - progress);

  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          "rounded-2xl p-4 animate-pulse",
          theme === 'light'
            ? "bg-white/80 border-2 border-emerald-200/60 shadow-md"
            : "bg-gradient-to-br from-emerald-900/40 to-slate-800/30 border border-emerald-800/30"
        )}
      >
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-20 h-20 rounded-full",
            theme === 'light' ? "bg-emerald-100" : "bg-emerald-900/30"
          )} />
          <div className="flex-1 space-y-2">
            <div className={cn("h-4 rounded w-20", theme === 'light' ? "bg-emerald-100" : "bg-emerald-900/30")} />
            <div className={cn("h-3 rounded w-32", theme === 'light' ? "bg-emerald-100" : "bg-emerald-900/30")} />
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
        "rounded-3xl p-5 sm:p-6 transition-all duration-300",
        theme === 'light'
          ? "bg-white/90 border-2 border-emerald-200/60 shadow-lg hover:shadow-xl"
          : "bg-gradient-to-br from-emerald-900/50 to-teal-950/40 border border-emerald-800/40 hover:border-emerald-700/50 shadow-lg"
      )}
    >
      <div className="flex items-center gap-5">
        {/* Circular Progress - Larger */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0">
          {/* Background circle */}
          <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="currentColor"
              strokeWidth="5"
              className={theme === 'light' ? "text-emerald-100" : "text-emerald-900/40"}
            />
            {/* Progress circle */}
            <motion.circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="url(#streakGradient)"
              strokeWidth="5"
              strokeLinecap="round"
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
              style={{ strokeDasharray: circumference }}
            />
            <defs>
              <linearGradient id="streakGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(158, 55%, 45%)" />
                <stop offset="100%" stopColor="hsl(174, 60%, 40%)" />
              </linearGradient>
            </defs>
          </svg>
          
          {/* Center content — без пульсации/радиального свечения (визуальный шум) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <FireIcon className={cn(
              "h-6 w-6 sm:h-7 sm:w-7 mb-0.5",
              streak > 0 ? "text-emerald-500" : theme === 'light' ? "text-emerald-300" : "text-emerald-700"
            )} />
            <span className={cn(
              "text-xl sm:text-2xl font-bold",
              theme === 'light' ? "text-slate-800" : "text-slate-200"
            )}>
              {streak}
            </span>
          </div>
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h4 className={cn(
              "text-base sm:text-lg font-bold",
              theme === 'light' ? "text-slate-800" : "text-slate-200"
            )}>
              {streak === 0 ? 'Начни вести дневник' : `${streak} ${streak === 1 ? 'день' : streak < 5 ? 'дня' : 'дней'}`}
            </h4>
            {streak >= 7 && (
              <SparklesIcon className="h-4 w-4 text-emerald-500" />
            )}
          </div>
          
          {streak > 0 ? (
            <p className={cn(
              "text-sm leading-relaxed",
              theme === 'light' ? "text-slate-600" : "text-slate-400"
            )}>
              {streakMessage}
            </p>
          ) : (
            <div className="space-y-3">
              <p className={cn(
                "text-sm leading-relaxed",
                theme === 'light' ? "text-slate-500" : "text-slate-400"
              )}>
                Каждая запись в дневнике = +1 день рядом с собой
              </p>
              <Button
                size="default"
                onClick={() => navigate('/diary')}
                className={cn(
                  "font-semibold px-5 py-2.5",
                  "bg-gradient-to-r from-emerald-700/80 to-teal-700/70 hover:from-emerald-600/80 hover:to-teal-600/70",
                  "text-emerald-50 shadow-md shadow-emerald-900/20",
                  "transition-all duration-300"
                )}
              >
                Открыть дневник
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
