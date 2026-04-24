import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Palette, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface PremiumPaywallProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: 'art-therapy';
}

const featureInfo = {
  'art-therapy': {
    title: 'Арт-терапия',
    description: 'Рисуй эмоции и получай анализ от AI',
    icon: Palette,
  },
};

const premiumFeatures = [
  '10 глубоких разборов с Мудрым наставником',
  'Безлимитная поддержка 24/7',
  'История души — память о твоих переживаниях',
  'Арт-терапия — 5 анализов в день',
];

export function PremiumPaywall({ open, onOpenChange, feature }: PremiumPaywallProps) {
  const navigate = useNavigate();
  const info = featureInfo[feature];
  const Icon = info.icon;

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate('/premium');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-primary/20 bg-gradient-to-b from-background to-background/95">
        <DialogHeader className="text-center pb-2">
          <motion.div 
            className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Icon className="w-8 h-8 text-primary" />
          </motion.div>
          
          <DialogTitle className="text-xl font-bold flex items-center justify-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            Функция тарифа «Опора»
          </DialogTitle>
          
          <DialogDescription className="text-base text-foreground/80 pt-2">
            <span className="font-medium text-primary">{info.title}</span> доступен в тарифе «Опора»
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 rounded-xl bg-accent/30 border border-border/40">
            <p className="text-sm text-muted-foreground text-center">
              {info.description}
            </p>
          </div>

          {/* Price */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="text-center py-2"
          >
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              от 690 ₽
            </span>
            <span className="text-sm text-muted-foreground">/мес</span>
          </motion.div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground/80">«Опора» включает:</p>
            <ul className="space-y-2">
              {premiumFeatures.map((feat, i) => (
                <motion.li 
                  key={feat}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.05 }}
                >
                  <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  {feat}
                </motion.li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button 
            onClick={handleUpgrade}
            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            <Crown className="w-4 h-4 mr-2" />
            Обрести Опору
          </Button>
          
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="w-full text-muted-foreground"
          >
            Пока достаточно Дыхания
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
