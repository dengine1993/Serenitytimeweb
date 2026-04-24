import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Heart, RefreshCw, Sparkles, Crown } from 'lucide-react';

interface PostDrawingScreenProps {
  isOpen: boolean;
  imageData: string;
  isPremium: boolean;
  isAnalyzing: boolean;
  remaining?: number;
  limit?: number;
  onAnalyze: () => void;
  onNewDrawing: () => void;
  onClose: () => void;
}

export function PostDrawingScreen({
  isOpen,
  imageData,
  isPremium,
  isAnalyzing,
  remaining = 3,
  limit = 3,
  onAnalyze,
  onNewDrawing,
  onClose,
}: PostDrawingScreenProps) {
  if (!isOpen) return null;

  const hasQuota = remaining > 0;

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
          className="relative w-full max-w-md bg-gradient-to-b from-card to-card/95 rounded-3xl p-6 shadow-2xl border border-border/30 overflow-hidden"
        >
          {/* Decorative glow */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-rose-400/20 rounded-full blur-3xl pointer-events-none" />
          
          {/* Drawing thumbnail */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="w-32 h-32 mx-auto mb-5 rounded-2xl overflow-hidden ring-2 ring-border/30 shadow-lg"
          >
            <img
              src={imageData}
              alt="Твой рисунок"
              className="w-full h-full object-cover"
            />
          </motion.div>

          {/* Thank you message */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-rose-400/30 to-pink-400/20 flex items-center justify-center"
          >
            <Heart className="w-7 h-7 text-rose-400" fill="currentColor" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="text-xl font-medium text-center text-foreground mb-2"
          >
            Спасибо, что поделился эмоциями ❤️
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-muted-foreground text-center text-sm mb-6"
          >
            Твой рисунок сохранён. Каждый штрих — это шаг к пониманию себя.
          </motion.p>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col gap-3"
          >
            <Button
              onClick={onAnalyze}
              disabled={isAnalyzing}
              className="w-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white h-12"
            >
              {isAnalyzing ? (
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Проанализировать с Jiva
                </>
              )}
            </Button>

            {/* Quota indicator for free users */}
            {!isPremium && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                className={`text-center py-2 px-4 rounded-full text-sm ${
                  hasQuota 
                    ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400' 
                    : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                }`}
              >
                {hasQuota ? (
                  <>Доступен <strong>1 бесплатный</strong> анализ</>
                ) : (
                  <>Бесплатный анализ использован</>
                )}
              </motion.div>
            )}

            {/* Premium badge */}
            {isPremium && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="text-center py-2 px-4 rounded-full text-sm bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center gap-2"
              >
                <Crown className="w-4 h-4" />
                <span>Осталось: {remaining} из {limit} сегодня</span>
              </motion.div>
            )}
            
            <Button
              onClick={onNewDrawing}
              variant="outline"
              className="w-full rounded-full h-12 border-border/50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Нарисовать новый
            </Button>

            <Button
              onClick={onClose}
              variant="ghost"
              className="w-full rounded-full h-10 text-muted-foreground hover:text-foreground"
            >
              Закрыть
            </Button>
          </motion.div>

          {!isPremium && !hasQuota && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-xs text-muted-foreground/70 text-center mt-4"
            >
              Безлимитный анализ доступен с Premium подпиской
            </motion.p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
