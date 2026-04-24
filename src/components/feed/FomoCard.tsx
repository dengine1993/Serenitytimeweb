import { SparklesIcon } from '@heroicons/react/24/solid';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useHomeTheme } from '@/hooks/useHomeTheme';
import { usePricing } from '@/hooks/usePricing';
import { Gift } from 'lucide-react';

export function FomoCard() {
  const navigate = useNavigate();
  const { theme } = useHomeTheme();
  const { monthlyEquivalent, yearlyDiscountPercent } = usePricing();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      onClick={() => navigate('/premium')}
      className={cn(
        "relative overflow-hidden cursor-pointer",
        "rounded-3xl p-5 sm:p-6",
        "transition-all duration-300",
        theme === 'light'
          ? "bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 border-2 border-violet-200/60 shadow-md hover:shadow-lg hover:border-violet-300/80"
          : "bg-gradient-to-br from-violet-500/10 via-purple-500/10 to-primary/10 backdrop-blur-xl border-2 border-violet/30 hover:border-violet/50"
      )}
      role="button"
      tabIndex={0}
      aria-label="Узнать о Premium"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate('/premium');
        }
      }}
    >
      {/* Subtle shimmer effect */}
      <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer-slide">
        <div className={cn(
          "h-full w-1/2 skew-x-12",
          theme === 'light'
            ? "bg-gradient-to-r from-transparent via-violet-100/50 to-transparent"
            : "bg-gradient-to-r from-transparent via-white/5 to-transparent"
        )} />
      </div>

      <div className="flex items-center gap-4">
        <div className={cn(
          "p-3 rounded-2xl",
          theme === 'light' ? "bg-violet-100" : "bg-violet/20"
        )}>
          <SparklesIcon className={cn(
            "h-6 w-6",
            theme === 'light' ? "text-violet-600" : "text-violet"
          )} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className={cn(
            "text-base font-bold mb-1",
            theme === 'light' ? "text-slate-800" : "text-foreground"
          )}>
            Опора — Мудрый наставник
          </h4>
          <p className={cn(
            "text-sm leading-relaxed",
            theme === 'light' ? "text-slate-600" : "text-muted-foreground/90"
          )}>
            Глубокая работа + история души
          </p>
        </div>

        <div className="flex flex-col items-end gap-0.5">
          <div className={cn(
            "text-sm font-bold px-3 py-1.5 rounded-full",
            theme === 'light'
              ? "bg-violet-100 text-violet-700"
              : "bg-violet/20 text-violet"
          )}>
            от {monthlyEquivalent} ₽
          </div>
          {yearlyDiscountPercent > 0 && (
            <span className="text-xs text-emerald-500 font-medium flex items-center gap-0.5">
              <Gift className="w-3 h-3" />
              −{yearlyDiscountPercent}% за год
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
