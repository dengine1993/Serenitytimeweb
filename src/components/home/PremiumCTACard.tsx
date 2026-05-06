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
  const { premiumMonthly } = usePricing();

  return (
    <motion.div 
      onClick={() => navigate('/premium')}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="relative group cursor-pointer"
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
      {/* Subtle glow */}
      <div className={cn(
        "absolute inset-0 rounded-2xl blur-2xl opacity-25 group-hover:opacity-45 transition-opacity duration-300",
        theme === 'light' ? "bg-amber-300" : "bg-orange-500"
      )} />
      
      {/* Banner */}
      <div className={cn(
        "relative flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition-all duration-300",
        theme === 'light'
          ? "bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 border border-amber-200/60 hover:border-orange-300 hover:shadow-lg hover:shadow-orange-100/50"
          : "bg-gradient-to-r from-orange-500/20 via-amber-500/14 to-rose-500/16 border border-orange-400/35 hover:border-orange-300/55 shadow-[0_0_30px_-10px_rgba(249,115,22,0.45)]"
      )}>
        {/* Left: Icon + Info */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Crown icon */}
          <div className={cn(
            "flex-shrink-0 p-1.5 rounded-lg",
            theme === 'light' ? "bg-amber-100" : "bg-orange-500/25"
          )}>
            <Crown className={cn(
              "h-4 w-4",
              theme === 'light' ? "text-orange-600" : "text-amber-300"
            )} />
          </div>
          
          {/* Title + Price */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn(
                "text-sm font-bold",
                theme === 'light' ? "text-gray-900" : "text-amber-50"
              )}>
                Premium
              </span>
              <span className={cn(
                "text-sm font-semibold",
                theme === 'light' ? "text-orange-600" : "text-amber-300"
              )}>
                {premiumMonthly} ₽/мес
              </span>
            </div>
            {/* One-liner benefit */}
            <p className={cn(
              "text-xs truncate",
              theme === 'light' ? "text-gray-500" : "text-amber-100/65"
            )}>
              Безлимит AI + «Образ дня» ×3/день
            </p>
          </div>
        </div>
        
        {/* Right: CTA Button */}
        <Button
          size="sm"
          className={cn(
            "flex-shrink-0 rounded-xl text-xs font-semibold px-3 h-8 border border-orange-300/30",
            "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white",
            "shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:shadow-[0_0_28px_rgba(249,115,22,0.6)]"
          )}
          onClick={(e) => {
            e.stopPropagation();
            navigate('/premium');
          }}
        >
          <span>Premium</span>
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
    </motion.div>
  );
}
