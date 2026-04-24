import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Palette, Leaf } from 'lucide-react';

interface WelcomeOverlayProps {
  isOpen: boolean;
  onStart: () => void;
}

export function WelcomeOverlay({ isOpen, onStart }: WelcomeOverlayProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-teal-900/80 via-blue-900/70 to-purple-900/80 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md text-center"
        >
          {/* Decorative elements */}
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-teal-400/20 rounded-full blur-3xl"
          />
          
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="relative w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-teal-400/30 to-cyan-400/30 flex items-center justify-center border border-white/20"
          >
            <Palette className="w-10 h-10 text-white" />
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute -top-2 -right-2"
            >
              <Leaf className="w-6 h-6 text-teal-300" />
            </motion.div>
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl sm:text-3xl font-light text-white mb-4"
          >
            Выражай эмоции через цвет и линию 🌿
          </motion.h2>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-white/80 text-base sm:text-lg leading-relaxed mb-3"
          >
            Здесь нет правил — рисуй всё, что чувствуешь сейчас.
          </motion.p>
          
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-white/70 text-sm sm:text-base mb-2"
          >
            Не нужно уметь рисовать. Это только для тебя.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="text-white/60 text-sm mb-8"
          >
            Когда закончишь — нажми «Готово».
          </motion.p>

          {/* Start button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              onClick={onStart}
              className="rounded-full bg-gradient-to-r from-teal-400 to-cyan-400 hover:from-teal-500 hover:to-cyan-500 text-white px-10 py-6 text-lg font-medium shadow-2xl shadow-teal-500/30"
            >
              <Palette className="w-5 h-5 mr-2" />
              Начать рисовать
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
