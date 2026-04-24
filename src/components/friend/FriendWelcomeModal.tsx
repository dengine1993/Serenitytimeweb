import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface FriendWelcomeModalProps {
  open: boolean;
  onClose: () => void;
  onStart: () => void;
}

export function FriendWelcomeModal({ open, onClose, onStart }: FriendWelcomeModalProps) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal container - centering with flexbox instead of translate */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="relative w-full max-w-sm max-h-[85vh] overflow-auto pointer-events-auto rounded-2xl bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 border border-white/10 shadow-2xl">
              {/* Decorative gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent pointer-events-none" />
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />
              
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-3 right-3 z-10 p-1.5 rounded-full hover:bg-white/10 transition-colors text-white/60 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
              
              {/* Content */}
              <div className="relative p-5 text-center space-y-4">
                {/* Avatar */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", damping: 15 }}
                  className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 p-[2px]"
                >
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                    <span className="text-2xl">🧠</span>
                  </div>
                </motion.div>
                
                {/* Greeting */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-2"
                >
                  <h2 className="text-xl font-semibold text-white">
                    Привет, я Jiva
                  </h2>
                  <p className="text-white/70 text-sm leading-relaxed">
                    Помогу разобраться в эмоциях, тревогах и мыслях. Выслушаю без осуждения и поделюсь техниками самопомощи.
                  </p>
                  <p className="text-white/60 text-xs leading-relaxed">
                    Я не заменяю врача, но могу поддержать и направить к полезным ресурсам.
                  </p>
                </motion.div>
                
                {/* Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex gap-2 pt-1"
                >
                  <Button
                    onClick={onStart}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium py-5 rounded-xl text-sm shadow-lg shadow-emerald-500/20"
                  >
                    Да, поговорим 💚
                  </Button>
                  <Button
                    onClick={onClose}
                    variant="ghost"
                    className="text-white/60 hover:text-white hover:bg-white/10 py-5 px-4 rounded-xl text-sm"
                  >
                    Позже
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
