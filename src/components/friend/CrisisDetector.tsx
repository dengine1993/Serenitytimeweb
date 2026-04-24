import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Phone, Heart, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CrisisDetectorProps {
  open: boolean;
  onClose: () => void;
}

const CRISIS_WORDS = [
  "суицид", "убить себя", "не хочу жить", "конец", "покончить",
  "самоубийство", "уйти из жизни", "хочу умереть", "лучше бы меня не было",
  "больше не могу", "невыносимо", "хочу исчезнуть"
];

export function detectCrisis(text: string): boolean {
  const lowerText = text.toLowerCase();
  return CRISIS_WORDS.some(word => lowerText.includes(word));
}

export function CrisisDetectorModal({ open, onClose }: CrisisDetectorProps) {
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 z-50 w-[90%] max-w-md -translate-x-1/2 -translate-y-1/2"
          >
            <div className="relative rounded-3xl bg-gradient-to-br from-rose-950/95 via-slate-900/95 to-slate-950/95 border border-rose-500/30 shadow-2xl overflow-hidden">
              {/* Top border gradient */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500" />
              
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-white/10 transition-colors text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="relative p-8 text-center space-y-5">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring" }}
                  className="w-16 h-16 mx-auto rounded-full bg-rose-500/20 flex items-center justify-center"
                >
                  <Heart className="w-8 h-8 text-rose-400" />
                </motion.div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">
                    Ты сейчас не один 💚
                  </h3>
                  <p className="text-white/70 text-base">
                    Я вижу, что тебе сейчас очень тяжело. Пожалуйста, поговори с кем-то, кто может помочь прямо сейчас.
                  </p>
                </div>
                
                <div className="space-y-3 pt-2">
                  <Button
                    onClick={() => navigate("/crisis")}
                    className="w-full bg-rose-500 hover:bg-rose-600 text-white font-medium py-6 rounded-2xl text-base"
                  >
                    <Phone className="w-5 h-5 mr-2" />
                    Горячие линии помощи
                  </Button>
                  
                  <Button
                    onClick={onClose}
                    variant="ghost"
                    className="w-full text-white/60 hover:text-white hover:bg-white/10 py-4 rounded-2xl"
                  >
                    Продолжить общение с Другом
                  </Button>
                </div>
                
                <p className="text-xs text-white/65">
                  Телефон доверия: 8-800-2000-122 (бесплатно, 24/7)
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
