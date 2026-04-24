import { motion } from 'framer-motion';
import { Brain, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/hooks/useI18n';

interface SMERPromptProps {
  onAnalyze: () => void;
  onDismiss: () => void;
  mood?: string;
}

/**
 * Contextual SMER prompt shown after saving an anxious mood
 * Triggers for: anxiety, fear, anger
 */
export function SMERPrompt({ onAnalyze, onDismiss, mood }: SMERPromptProps) {
  const { t, language } = useI18n();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="fixed inset-x-4 bottom-24 sm:bottom-8 sm:left-auto sm:right-4 sm:max-w-sm z-50"
    >
      <div className="relative bg-gradient-to-br from-primary/10 via-background/95 to-background/90 backdrop-blur-xl border border-primary/20 rounded-2xl p-5 shadow-2xl shadow-primary/10">
        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/10 transition-colors text-white/50 hover:text-white/80"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-primary/20 shrink-0">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div className="pr-6">
            <h3 className="font-semibold text-white mb-1">
              {language === 'ru' 
                ? 'Хочешь разобрать, что произошло?' 
                : 'Want to understand what happened?'}
            </h3>
            <p className="text-sm text-white/60 leading-relaxed">
              {language === 'ru'
                ? 'СМЭР поможет увидеть связь мыслей и эмоций. Это займёт 2-3 минуты.'
                : 'SMER helps see the connection between thoughts and emotions. It takes 2-3 minutes.'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="flex-1 text-white/60 hover:text-white hover:bg-white/10"
          >
            {language === 'ru' ? 'Может потом' : 'Maybe later'}
          </Button>
          <Button
            size="sm"
            onClick={onAnalyze}
            className="flex-1 gap-1.5 bg-primary hover:bg-primary/90"
          >
            {language === 'ru' ? 'Разобрать' : 'Analyze'}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Helper to check if a mood should trigger SMER prompt
 */
export const shouldTriggerSMER = (mood: string | null): boolean => {
  if (!mood) return false;
  return ['anxiety', 'fear', 'anger'].includes(mood);
};
