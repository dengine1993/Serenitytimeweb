import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Lock, MessageCircle, Sparkles, ArrowRight, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import jivaLogo from '@/assets/jiva.png';

interface JivaReplyUpsellModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context?: 'trial_limit' | 'trial_used' | 'default';
}

export function JivaReplyUpsellModal({ open, onOpenChange, context = 'default' }: JivaReplyUpsellModalProps) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate('/premium');
  };

  const getContent = () => {
    switch (context) {
      case 'trial_limit':
        return {
          title: 'Диалог завершён',
          subtitle: '3 сообщения — это было только начало',
          description: 'Тебе понравилось? С Опорой Jiva сможет отвечать тебе под любым постом — до 3 ответов в день.',
          buttonText: 'Продолжить с Jiva',
          showTrialComplete: true,
        };
      case 'trial_used':
        return {
          title: 'Jiva уже ждёт',
          subtitle: 'Ты уже пробовал(а) диалог с ней',
          description: 'Пробный диалог уже был. С Опорой Jiva отвечает под любым постом — до 3 ответов в день.',
          buttonText: 'Открыть диалоги с Jiva',
          showTrialComplete: false,
        };
      default:
        return {
          title: 'Jiva готова продолжить',
          subtitle: null,
          description: 'Чтобы Jiva отвечала под постами в ленте, нужен тариф «Опора».',
          buttonText: 'Обрести Опору',
          showTrialComplete: false,
        };
    }
  };

  const content = getContent();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-background via-background to-violet-500/5 border-violet-500/20">
        <DialogHeader className="text-center pb-2">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="mx-auto mb-4 relative"
          >
            {/* Jiva avatar with violet glow */}
            <div className="relative h-20 w-20">
              <div className="absolute inset-0 rounded-full bg-violet-400/40 blur-xl" />
              <img
                src={jivaLogo}
                alt="Jiva"
                className="relative h-20 w-20 rounded-full object-cover ring-2 ring-violet-300/50 shadow-xl"
              />
              <div className={`absolute -bottom-1 -right-1 h-8 w-8 rounded-full flex items-center justify-center shadow-lg ${
                content.showTrialComplete ? 'bg-emerald-500' : 'bg-amber-500'
              }`}>
                {content.showTrialComplete ? (
                  <CheckCircle className="h-4 w-4 text-white" />
                ) : (
                  <Lock className="h-4 w-4 text-white" />
                )}
              </div>
            </div>

            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -top-2 -right-2"
            >
              <Sparkles className="h-5 w-5 text-amber-400" />
            </motion.div>
          </motion.div>

          <DialogTitle className="text-xl font-bold">
            {content.title}
          </DialogTitle>

          {content.subtitle && (
            <p className="text-sm text-muted-foreground mt-1">
              {content.subtitle}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-center text-muted-foreground leading-relaxed">
            {content.description}
          </p>

          <div className="bg-violet-500/5 border border-violet-500/10 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <MessageCircle className="h-4 w-4 text-violet-500 flex-shrink-0" />
              <span className="text-foreground/90">3 ответа Jiva в день под любым постом</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Sparkles className="h-4 w-4 text-violet-500 flex-shrink-0" />
              <span className="text-foreground/90">Голосовые сессии с Jiva и память</span>
            </div>
          </div>

          {context === 'trial_limit' && (
            <p className="text-center text-xs text-muted-foreground/70">
              Тебе понравилось? Это только начало 🚀
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button
            onClick={handleUpgrade}
            className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white gap-2"
          >
            {content.buttonText}
            <ArrowRight className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            Позже
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
