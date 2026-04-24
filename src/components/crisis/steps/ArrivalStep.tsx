import { motion } from "framer-motion";
import { Heart, Phone, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";
import { useNavigate } from "react-router-dom";
import logoImage from "@/assets/logo-bezm.png";

interface ArrivalStepProps {
  isDark: boolean;
  onStart: () => void;
  onEmergency: () => void;
  onBack: () => void;
}

export const ArrivalStep = ({ isDark, onStart, onEmergency }: ArrivalStepProps) => {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center text-center px-4 py-8">
      {/* Back button - goes to previous page in history */}
      <button 
        onClick={() => navigate(-1)}
        className={`self-start mb-6 flex items-center gap-2 text-sm ${
          isDark ? 'text-white/60 hover:text-white/80' : 'text-gray-500 hover:text-gray-700'
        } transition-colors`}
      >
        <ArrowLeft className="w-4 h-4" />
        {t('common.back')}
      </button>
      {/* Jiva Avatar with breathing animation */}
      <motion.div
        className="relative mb-6"
        animate={{ 
          scale: [1, 1.05, 1],
        }}
        transition={{ 
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <div className={`absolute inset-0 rounded-full blur-2xl ${
          isDark ? 'bg-purple-500/30' : 'bg-pink-300/50'
        }`} />
        <img 
          src={logoImage} 
          alt="Безмятежные"
          className="relative w-28 h-28 rounded-full object-cover"
        />
        <motion.div
          className={`absolute -inset-2 rounded-full border-2 ${
            isDark ? 'border-purple-400/40' : 'border-pink-300/60'
          }`}
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.2, 0.5] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </motion.div>

      {/* Title */}
      <h1 className={`text-2xl font-bold mb-3 ${
        isDark ? 'text-white' : 'text-gray-800'
      }`}>
        {t('crisis.wizard.arrival.title')}
      </h1>

      {/* Message */}
      <p className={`text-lg mb-8 max-w-xs leading-relaxed ${
        isDark ? 'text-white/80' : 'text-gray-600'
      }`}>
        {t('crisis.wizard.arrival.message')}
      </p>

      {/* Start Button */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full max-w-xs"
      >
        <Button
          onClick={onStart}
          size="lg"
          className={`w-full py-6 text-lg font-medium rounded-2xl shadow-lg ${
            isDark 
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white' 
              : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white'
          }`}
        >
          <Heart className="w-5 h-5 mr-2" />
          {t('crisis.wizard.arrival.start')}
        </Button>
      </motion.div>

      {/* Emergency Link */}
      <button
        onClick={onEmergency}
        className={`mt-6 flex items-center gap-2 text-sm ${
          isDark ? 'text-white/60 hover:text-white/80' : 'text-gray-500 hover:text-gray-700'
        } transition-colors`}
      >
        <Phone className="w-4 h-4" />
        {t('crisis.wizard.arrival.emergency')}
      </button>
    </div>
  );
};
