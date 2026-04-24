import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, RefreshCw, X, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/hooks/useI18n';

interface AnalysisResultModalProps {
  isOpen: boolean;
  imageData: string;
  feedback: string;
  tags: string[];
  onSaveToJournal: () => void;
  onNewDrawing: () => void;
  onClose: () => void;
  isSaving: boolean;
  isPremium?: boolean;
  periodType?: 'daily' | 'lifetime' | 'none';
}

export function AnalysisResultModal({
  isOpen,
  imageData,
  feedback,
  tags,
  onSaveToJournal,
  onNewDrawing,
  onClose,
  isSaving,
  isPremium = false,
  periodType = 'none',
}: AnalysisResultModalProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  
  if (!isOpen) return null;

  const showTrialUpsell = !isPremium && periodType === 'lifetime';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-gradient-to-b from-card to-card/95 rounded-3xl p-6 shadow-2xl border border-border/30 overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted/50 transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* Decorative glow */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#20B2AA]/20 rounded-full blur-3xl pointer-events-none" />
          
          {/* Drawing thumbnail */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="w-24 h-24 mx-auto mb-5 rounded-2xl overflow-hidden ring-2 ring-border/30 shadow-lg"
          >
            <img
              src={imageData}
              alt="Your drawing"
              className="w-full h-full object-cover"
            />
          </motion.div>


          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="text-xl font-light text-center text-foreground mb-4"
          >
            {t('artTherapy.aiSaw')}
          </motion.h2>

          {/* Feedback text */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-5"
          >
            <p className="text-muted-foreground leading-relaxed text-center font-serif italic text-base">
              "{feedback}"
            </p>
          </motion.div>

          {/* Trial Upsell Block */}
          {showTrialUpsell && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="mb-5 p-4 rounded-xl bg-[#20B2AA]/10 border border-[#20B2AA]/20"
            >
              <p className="text-sm text-center text-foreground mb-2">
                💙 Это был твой бесплатный анализ
              </p>
              <p className="text-xs text-center text-muted-foreground mb-3">
                В премиум — 3 анализа каждый день + Jiva без лимитов
              </p>
              <Button 
                onClick={() => navigate('/premium')}
                variant="outline"
                className="w-full rounded-full border-[#20B2AA]/30 hover:bg-[#20B2AA]/10"
              >
                <Crown className="w-4 h-4 mr-2 text-[#20B2AA]" />
                Узнать про Опору
              </Button>
            </motion.div>
          )}

          {/* Disclaimer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="text-xs text-muted-foreground/70 text-center mb-4 italic"
          >
            {t('artTherapy.disclaimer')}
          </motion.p>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col gap-3"
          >
            <Button
              onClick={onSaveToJournal}
              disabled={isSaving}
              className="w-full rounded-full bg-[#20B2AA] hover:bg-[#1a9a94] text-white h-12"
            >
              {isSaving ? (
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : (
                <>
                  <BookOpen className="w-4 h-4 mr-2" />
                  {t('artTherapy.saveToJournal')}
                </>
              )}
            </Button>
            
            <Button
              onClick={onNewDrawing}
              variant="ghost"
              className="w-full rounded-full h-12 text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('artTherapy.newDrawing')}
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
