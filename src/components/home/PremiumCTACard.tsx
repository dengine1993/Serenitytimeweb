import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useHomeTheme } from '@/hooks/useHomeTheme';
import { usePricing } from '@/hooks/usePricing';
import { cn } from '@/lib/utils';
import { Crown, ArrowRight } from 'lucide-react';

export function PremiumCTACard() {
  const navigate = useNavigate();
  const { theme } = useHomeTheme();
  const { monthlyEquivalent, yearlyDiscountPercent } = usePricing();

  return (
    <motion.div 
      onClick={() => navigate('/premium')}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="relative group cursor-pointer"
      role="button"
      tabIndex={0}
      aria-label="Узнать об Опоре"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate('/premium');
        }
      }}
    >
      {/* Subtle glow */}
      <div className={cn(
        "absolute inset-0 rounded-2xl blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-300",
        theme === 'light' ? "bg-violet-400" : "bg-cyan-500"
      )} />
      
      {/* Banner */}
      <div className={cn(
        "relative flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition-all duration-300",
        theme === 'light'
          ? "bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200/60 hover:border-violet-300 hover:shadow-lg hover:shadow-violet-100/50"
          : "bg-gradient-to-r from-cyan-900/30 to-slate-800/30 border border-cyan-800/40 hover:border-cyan-700/50"
      )}>
        {/* Left: Icon + Info */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Crown icon */}
          <div className={cn(
            "flex-shrink-0 p-1.5 rounded-lg",
            theme === 'light' ? "bg-violet-100" : "bg-cyan-800/50"
          )}>
            <Crown className={cn(
              "h-4 w-4",
              theme === 'light' ? "text-violet-600" : "text-cyan-400"
            )} />
          </div>
          
          {/* Title + Price */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn(
                "text-sm font-bold",
                theme === 'light' ? "text-gray-900" : "text-slate-200"
              )}>
                Опора
              </span>
              <span className={cn(
                "text-sm font-semibold",
                theme === 'light' ? "text-violet-600" : "text-cyan-400"
              )}>
                от {monthlyEquivalent} ₽/мес
              </span>
              {yearlyDiscountPercent > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-medium">
                  −{yearlyDiscountPercent}%
                </span>
              )}
            </div>
            {/* One-liner benefit */}
            <p className={cn(
              "text-xs truncate",
              theme === 'light' ? "text-gray-500" : "text-slate-500"
            )}>
              Безлимит AI + арт-терапия ×3/день
            </p>
          </div>
        </div>
        
        {/* Right: CTA Button */}
        <Button
          size="sm"
          className={cn(
            "flex-shrink-0 rounded-xl text-xs font-semibold px-3 h-8",
            theme === 'light'
              ? "bg-violet-600 hover:bg-violet-700 text-white"
              : "bg-cyan-600 hover:bg-cyan-500 text-white"
          )}
          onClick={(e) => {
            e.stopPropagation();
            navigate('/premium');
          }}
        >
          <span>Опора</span>
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
    </motion.div>
  );
}
