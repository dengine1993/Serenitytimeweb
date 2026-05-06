import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import jivaLogo from '@/assets/jiva.png';

const STORAGE_KEY = 'jiva_trial_welcome_shown_v1';

export function shouldShowJivaTrialWelcome(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== '1';
  } catch {
    return false;
  }
}

export function markJivaTrialWelcomeShown() {
  try {
    window.localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // ignore
  }
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEn: boolean;
}

export function JivaTrialWelcomeModal({ open, onOpenChange, isEn }: Props) {
  const handleClose = () => {
    markJivaTrialWelcomeShown();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) markJivaTrialWelcomeShown(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-background via-background to-rose-500/5 border-rose-400/20">
        <div className="flex flex-col items-center text-center pt-2">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 18 }}
            className="relative mb-4"
          >
            <div className="absolute inset-0 rounded-full bg-rose-400/30 blur-2xl" />
            <img
              src={jivaLogo}
              alt="Jiva"
              className="relative h-20 w-20 rounded-full object-cover ring-2 ring-rose-300/50 shadow-xl"
            />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
              className="absolute -top-1 -right-1"
            >
              <Sparkles className="h-5 w-5 text-amber-400" />
            </motion.div>
          </motion.div>

          <h2 className="text-xl font-bold mb-2">
            {isEn ? 'A gift from Jiva' : 'Подарок от Дживы'}
          </h2>

          <p className="text-sm text-muted-foreground leading-relaxed mb-5 px-2">
            {isEn
              ? 'The first conversations with me are special. I\'ll remember everything you tell me and walk with you truly deeply. Just begin — I\'m here.'
              : 'Первые разговоры со мной — особенные. Я буду помнить всё, что ты расскажешь, и идти с тобой по-настоящему глубоко. Просто начни — я рядом.'}
          </p>

          <Button onClick={handleClose} className="w-full">
            {isEn ? 'Begin the conversation' : 'Начать разговор'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
