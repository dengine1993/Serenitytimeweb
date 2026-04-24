import { motion } from 'framer-motion';
import { Gift, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SavingsBadgeProps {
  savings: number;
  className?: string;
  variant?: 'default' | 'compact' | 'inline';
}

export function SavingsBadge({ savings, className, variant = 'default' }: SavingsBadgeProps) {
  if (savings <= 0) return null;

  if (variant === 'inline') {
    return (
      <span className={cn(
        "inline-flex items-center gap-1 text-emerald-500 font-medium",
        className
      )}>
        <Gift className="w-3.5 h-3.5" />
        −{savings} ₽
      </span>
    );
  }

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn(
          "inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full text-xs font-semibold border border-emerald-500/20",
          className
        )}
      >
        <Gift className="w-3 h-3" />
        Экономия {savings} ₽
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "relative overflow-hidden rounded-2xl",
        className
      )}
    >
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20" />
      
      {/* Shimmer Effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
      />

      <div className="relative px-5 py-4 flex items-center justify-between gap-4 border border-emerald-500/30 rounded-2xl backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {/* Pulsing Icon */}
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30"
          >
            <Gift className="w-6 h-6 text-white" />
          </motion.div>
          
          <div>
            <p className="text-sm text-muted-foreground">Ваша экономия</p>
            <motion.p
              key={savings}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-bold text-emerald-600 dark:text-emerald-400"
            >
              {savings} ₽
            </motion.p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-amber-500">
          <Sparkles className="w-4 h-4" />
          <span className="text-xs font-medium">В год</span>
        </div>
      </div>
    </motion.div>
  );
}
