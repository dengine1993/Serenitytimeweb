import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Brain, Crown, Calendar, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PRICES } from '@/config/plans';

interface DailyLimitPaywallProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usedCount: number;
  limitCount: number;
}

export function DailyLimitPaywall({ open, onOpenChange, usedCount, limitCount }: DailyLimitPaywallProps) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate('/premium');
  };

  const handleLater = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-amber-500/20 bg-gradient-to-b from-background to-amber-950/10">
        <DialogHeader className="text-center pb-2">
          <motion.div 
            className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 flex items-center justify-center border border-amber-500/30"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Brain className="w-8 h-8 text-amber-500" />
          </motion.div>
          
          <DialogTitle className="text-xl font-bold text-foreground">
            Твой лимит Дыхания исчерпан
          </DialogTitle>
          
          <DialogDescription className="text-base pt-2">
            <span className="font-medium text-amber-400">({usedCount}/{limitCount})</span> на сегодня
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Free explanation */}
          <div className="p-4 rounded-xl bg-muted/50 border border-border/40">
            <p className="text-sm text-muted-foreground leading-relaxed">
              В тарифе «Дыхание» используется Быстрый помощник — 
              он идеален, чтобы выслушать и дать технику заземления здесь и сейчас.
            </p>
          </div>

          {/* Premium explanation */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <div className="flex items-start gap-3 mb-3">
              <div className="p-1.5 rounded-lg bg-primary/20">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground text-sm mb-1">
                  Мудрый наставник Jiva
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Нейросеть с навыком рассуждения, которая не просто отвечает, 
                  а <span className="text-primary font-medium">думает вместе с тобой</span> и помнит контекст.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3 pt-3 border-t border-primary/10">
              <Calendar className="w-4 h-4" />
              <span>10 глубоких разборов + безлимитная поддержка</span>
            </div>
          </div>

          {/* Price */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center py-2"
          >
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              {PRICES.PREMIUM_RUB} ₽
            </span>
            <span className="text-sm text-muted-foreground">/мес</span>
            <p className="text-xs text-muted-foreground mt-1">
              Цена чашки кофе за месяц спокойствия
            </p>
          </motion.div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button 
            onClick={handleUpgrade}
            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 h-12"
          >
            <Crown className="w-4 h-4 mr-2" />
            Обрести Опору
          </Button>
          
          <Button 
            variant="ghost" 
            onClick={handleLater}
            className="w-full text-muted-foreground"
          >
            Вернуться завтра
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
