import { motion } from 'framer-motion';
import { ArrowRight, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PriceBreakdownProps {
  originalPrice: number;
  discountedPrice: number;
  period: 'monthly' | 'yearly';
  className?: string;
}

export function PriceBreakdown({
  originalPrice,
  discountedPrice,
  period,
  className,
}: PriceBreakdownProps) {
  const savings = originalPrice - discountedPrice;
  const discountPercent = Math.round((savings / originalPrice) * 100);
  const monthlyEquivalent = period === 'yearly' ? Math.round(discountedPrice / 12) : discountedPrice;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Price Display */}
      <div className="flex items-center justify-center gap-4">
        {period === 'yearly' && (
          <>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-center"
            >
              <p className="text-xs text-muted-foreground mb-1">Было бы</p>
              <p className="text-xl text-muted-foreground line-through decoration-destructive decoration-2">
                {originalPrice} ₽
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <ArrowRight className="w-5 h-5 text-emerald-500" />
            </motion.div>
          </>
        )}

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <p className="text-xs text-muted-foreground mb-1">
            {period === 'yearly' ? 'С годовой подпиской' : 'Ежемесячно'}
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-foreground">
              {discountedPrice}
            </span>
            <span className="text-lg text-muted-foreground">₽</span>
          </div>
        </motion.div>

        {period === 'yearly' && savings > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-bold text-sm shadow-lg shadow-emerald-500/30"
          >
            −{discountPercent}%
          </motion.div>
        )}
      </div>

      {/* Monthly Equivalent for Yearly */}
      {period === 'yearly' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-center gap-2 text-sm"
        >
          <Zap className="w-4 h-4 text-amber-500" />
          <span className="text-muted-foreground">
            Всего <span className="font-semibold text-foreground">{monthlyEquivalent} ₽/мес</span>
          </span>
        </motion.div>
      )}

      {/* Visual Savings Bar */}
      {period === 'yearly' && savings > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="max-w-xs mx-auto"
        >
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Стоимость</span>
            <span className="text-emerald-500">Экономия {savings} ₽</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden flex">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${100 - discountPercent}%` }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="h-full bg-gradient-to-r from-primary to-violet-500"
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${discountPercent}%` }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500"
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}
