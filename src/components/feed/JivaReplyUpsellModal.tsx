import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Lock, MessageCircle, Sparkles, ArrowRight, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/hooks/useI18n';
import jivaLogo from '@/assets/jiva.png';

interface JivaReplyUpsellModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context?: 'trial_limit' | 'trial_used' | 'default';
}

export function JivaReplyUpsellModal({ open, onOpenChange, context = 'default' }: JivaReplyUpsellModalProps) {
  const navigate = useNavigate();
  const { t } = useI18n();

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate('/premium');
  };

  const getContent = () => {
    switch (context) {
      case 'trial_limit':
        return {
          title: t('feed.upsell.trialLimitTitle'),
          subtitle: t('feed.upsell.trialLimitSubtitle'),
          description: t('feed.upsell.trialLimitDescription'),
          buttonText: t('feed.upsell.trialLimitButton'),
          showTrialComplete: true,
        };
      case 'trial_used':
        return {
          title: t('feed.upsell.trialUsedTitle'),
          subtitle: t('feed.upsell.trialUsedSubtitle'),
          description: t('feed.upsell.trialUsedDescription'),
          buttonText: t('feed.upsell.trialUsedButton'),
          showTrialComplete: false,
        };
      default:
        return {
          title: t('feed.upsell.defaultTitle'),
          subtitle: null as string | null,
          description: t('feed.upsell.defaultDescription'),
          buttonText: t('feed.upsell.defaultButton'),
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
              <span className="text-foreground/90">{t('feed.upsell.benefitReplies')}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Sparkles className="h-4 w-4 text-violet-500 flex-shrink-0" />
              <span className="text-foreground/90">{t('feed.upsell.benefitMemory')}</span>
            </div>
          </div>

          {context === 'trial_limit' && (
            <p className="text-center text-xs text-muted-foreground/70">
              {t('feed.upsell.teaser')}
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
            {t('feed.upsell.later')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
