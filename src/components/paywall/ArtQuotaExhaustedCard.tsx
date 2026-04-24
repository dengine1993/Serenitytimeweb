import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Sparkles, MessageCircle, Brain, X, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/hooks/useI18n';

interface ArtQuotaExhaustedCardProps {
  imageData: string;
  onClose: () => void;
}

const benefits = [
  {
    icon: Palette,
    title: '3 анализа каждый день',
    description: 'Рисуй и понимай себя',
  },
  {
    icon: MessageCircle,
    title: 'Jiva 24/7',
    description: '10 сообщений без ограничений',
  },
  {
    icon: Brain,
    title: 'Память о тебе',
    description: 'Не начинаем с нуля',
  },
];

export function ArtQuotaExhaustedCard({ imageData, onClose }: ArtQuotaExhaustedCardProps) {
  const navigate = useNavigate();
  const { t } = useI18n();

  const handleContinue = () => {
    navigate('/premium');
  };

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
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted/50 transition-colors z-10"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* Decorative glow */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#20B2AA]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          
          {/* Drawing thumbnail */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="w-24 h-24 mx-auto mb-5 rounded-2xl overflow-hidden ring-2 ring-[#20B2AA]/30 shadow-lg relative"
          >
            <img
              src={imageData}
              alt="Твой рисунок"
              className="w-full h-full object-cover"
            />
            {/* Waiting indicator */}
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 flex items-center justify-center bg-black/30"
            >
              <Sparkles className="w-8 h-8 text-white" />
            </motion.div>
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl font-medium text-center text-foreground mb-2"
          >
            Твой рисунок ждёт разбора 🎨
          </motion.h2>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="text-sm text-muted-foreground text-center mb-5 leading-relaxed"
          >
            Jiva видит в нём историю, которую хочется рассказать. 
            Жаль, что бесплатный анализ уже использован.
          </motion.p>

          {/* Premium benefits card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-[#20B2AA]/10 to-purple-500/5 rounded-2xl p-4 mb-5 border border-[#20B2AA]/20"
          >
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-4 h-4 text-[#20B2AA]" />
              <span className="text-sm font-medium text-foreground">Опора — от 690₽/мес</span>
            </div>
            
            <div className="space-y-2.5">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + index * 0.1 }}
                  className="flex items-start gap-2.5"
                >
                  <div className="w-6 h-6 rounded-full bg-[#20B2AA]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <benefit.icon className="w-3.5 h-3.5 text-[#20B2AA]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{benefit.title}</p>
                    <p className="text-xs text-muted-foreground">{benefit.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* CTA Button with pulse */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <motion.div
              animate={{ 
                scale: [1, 1.02, 1],
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            >
              <Button
                onClick={handleContinue}
                className="w-full rounded-full bg-[#20B2AA] hover:bg-[#1a9a94] text-white h-12 font-medium"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Раскрыть смысл рисунка
              </Button>
            </motion.div>
          </motion.div>

          {/* Escape hatch */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-xs text-muted-foreground/70 text-center mt-4"
          >
            или просто рисуй — это тоже терапия 💙
          </motion.p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
