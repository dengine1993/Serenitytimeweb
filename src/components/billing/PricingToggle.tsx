import { motion, AnimatePresence } from 'framer-motion';
import { Check, Sparkles, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PricingToggleProps {
  period: 'monthly' | 'yearly';
  onPeriodChange: (period: 'monthly' | 'yearly') => void;
  monthlyPrice: number;
  yearlyPrice: number;
  loading?: boolean;
}

export function PricingToggle({
  period,
  onPeriodChange,
  monthlyPrice,
  yearlyPrice,
  loading = false,
}: PricingToggleProps) {
  const monthlyEquivalent = Math.round(yearlyPrice / 12);
  const fullYearlyPrice = monthlyPrice * 12;
  const savings = fullYearlyPrice - yearlyPrice;
  const discountPercent = Math.round((savings / fullYearlyPrice) * 100);
  const freeMonths = Math.round(savings / monthlyPrice);

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Toggle Container */}
      <div className="relative bg-muted/50 backdrop-blur-sm rounded-2xl p-1.5 border border-border/50">
        <div className="grid grid-cols-2 gap-1.5">
          {/* Monthly Option */}
          <button
            onClick={() => onPeriodChange('monthly')}
            className={cn(
              "relative rounded-xl px-4 py-4 transition-all duration-300",
              period === 'monthly'
                ? "bg-background shadow-lg"
                : "hover:bg-background/50"
            )}
          >
            <div className="flex flex-col items-center gap-1">
              <span className={cn(
                "text-sm font-medium transition-colors",
                period === 'monthly' ? "text-foreground" : "text-muted-foreground"
              )}>
                Ежемесячно
              </span>
              <motion.span
                key={`monthly-${monthlyPrice}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "text-2xl font-bold transition-colors",
                  period === 'monthly' ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {loading ? '...' : `${monthlyPrice} ₽`}
              </motion.span>
              <span className="text-xs text-muted-foreground">в месяц</span>
            </div>
            
            {period === 'monthly' && (
              <motion.div
                layoutId="check-indicator"
                className="absolute top-2 right-2"
              >
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              </motion.div>
            )}
          </button>

          {/* Yearly Option */}
          <button
            onClick={() => onPeriodChange('yearly')}
            className={cn(
              "relative rounded-xl px-4 py-4 transition-all duration-300 overflow-hidden",
              period === 'yearly'
                ? "bg-gradient-to-br from-violet-500/10 to-primary/10 shadow-lg border border-primary/20"
                : "hover:bg-background/50"
            )}
          >
            {/* Popular Badge */}
            <div className="absolute -top-0.5 left-1/2 -translate-x-1/2">
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-b-md shadow-lg"
              >
                ВЫГОДНО
              </motion.div>
            </div>

            <div className="flex flex-col items-center gap-1 pt-2">
              <span className={cn(
                "text-sm font-medium transition-colors flex items-center gap-1",
                period === 'yearly' ? "text-foreground" : "text-muted-foreground"
              )}>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Годовая
              </span>
              
              <div className="flex items-baseline gap-1.5">
                <motion.span
                  key={`yearly-${yearlyPrice}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "text-2xl font-bold transition-colors",
                    period === 'yearly' ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {loading ? '...' : `${yearlyPrice} ₽`}
                </motion.span>
              </div>
              
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-muted-foreground line-through">
                  {fullYearlyPrice} ₽
                </span>
                <span className="text-emerald-500 font-semibold">
                  −{discountPercent}%
                </span>
              </div>
            </div>

            {period === 'yearly' && (
              <motion.div
                layoutId="check-indicator"
                className="absolute top-2 right-2"
              >
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              </motion.div>
            )}
          </button>
        </div>
      </div>

      {/* Savings Info */}
      <AnimatePresence mode="wait">
        {period === 'yearly' && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent rounded-xl p-4 border border-emerald-500/20">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Экономия {savings} ₽ в год
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Это как {freeMonths} месяца бесплатно!
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-lg font-bold text-foreground">
                    {monthlyEquivalent} ₽/мес
                  </p>
                  <p className="text-xs text-muted-foreground">
                    при оплате за год
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>Вы платите</span>
                  <span>Экономите {discountPercent}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${100 - discountPercent}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="h-full bg-gradient-to-r from-primary to-violet-500 rounded-full"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
