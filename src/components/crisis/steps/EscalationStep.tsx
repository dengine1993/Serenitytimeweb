import { motion } from "framer-motion";
import { ArrowLeft, Heart, RefreshCw, Phone } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

interface EscalationStepProps {
  isDark: boolean;
  onContinueBreathing: () => void;
  onTalkToSomeone: () => void;
  onBack: () => void;
}

export const EscalationStep = ({ 
  isDark, 
  onContinueBreathing, 
  onTalkToSomeone, 
  onBack 
}: EscalationStepProps) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center text-center px-4 py-8">
      {/* Back button */}
      <button
        onClick={onBack}
        className={`self-start mb-6 flex items-center gap-2 text-sm ${
          isDark ? 'text-white/60 hover:text-white/80' : 'text-gray-500 hover:text-gray-700'
        } transition-colors`}
      >
        <ArrowLeft className="w-4 h-4" />
        {t('common.back')}
      </button>

      {/* Heart icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", damping: 10 }}
        className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${
          isDark 
            ? 'bg-gradient-to-br from-pink-500/20 to-purple-500/20' 
            : 'bg-gradient-to-br from-pink-100 to-purple-100'
        }`}
      >
        <Heart className={`w-10 h-10 ${isDark ? 'text-pink-400' : 'text-pink-500'}`} />
      </motion.div>

      {/* Title */}
      <motion.h2 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}
      >
        {t('crisis.wizard.escalation.title')}
      </motion.h2>

      {/* Message */}
      <motion.p 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={`text-sm mb-8 max-w-xs ${isDark ? 'text-white/70' : 'text-gray-600'}`}
      >
        {t('crisis.wizard.escalation.message')}
      </motion.p>

      {/* Options */}
      <div className="flex flex-col gap-3 w-full max-w-sm">
        {/* Continue breathing */}
        <motion.button
          onClick={onContinueBreathing}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${
            isDark 
              ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-500/30 hover:border-blue-400/50' 
              : 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200 hover:border-blue-300'
          }`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isDark ? 'bg-blue-500/20' : 'bg-blue-100'
          }`}>
            <RefreshCw className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
          </div>
          <div className="text-left">
            <span className={`block font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
              {t('crisis.wizard.escalation.continue')}
            </span>
            <span className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
              {t('crisis.wizard.escalation.continueHint')}
            </span>
          </div>
        </motion.button>

        {/* Talk to someone */}
        <motion.button
          onClick={onTalkToSomeone}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${
            isDark 
              ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30 hover:border-purple-400/50' 
              : 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 hover:border-purple-300'
          }`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isDark ? 'bg-purple-500/20' : 'bg-purple-100'
          }`}>
            <Phone className={`w-6 h-6 ${isDark ? 'text-purple-400' : 'text-purple-500'}`} />
          </div>
          <div className="text-left">
            <span className={`block font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
              {t('crisis.wizard.escalation.talk')}
            </span>
            <span className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
              {t('crisis.wizard.escalation.talkHint')}
            </span>
          </div>
        </motion.button>
      </div>
    </div>
  );
};
