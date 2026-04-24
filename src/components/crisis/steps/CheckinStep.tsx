import { motion } from "framer-motion";
import { ArrowLeft, Sun, Minus, CloudRain } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { CheckinResponse } from "../CrisisWizard";

interface CheckinStepProps {
  isDark: boolean;
  onSelect: (response: CheckinResponse) => void;
  onBack: () => void;
}

const checkinOptions: { 
  response: CheckinResponse; 
  icon: typeof Sun; 
  key: string;
  color: { dark: string; light: string; iconDark: string; iconLight: string };
}[] = [
  { 
    response: "better", 
    icon: Sun, 
    key: "better",
    color: { 
      dark: 'from-green-500/20 to-emerald-500/20 border-green-500/30', 
      light: 'from-green-50 to-emerald-50 border-green-200',
      iconDark: 'text-green-400',
      iconLight: 'text-green-500'
    }
  },
  { 
    response: "same", 
    icon: Minus, 
    key: "same",
    color: { 
      dark: 'from-gray-500/20 to-slate-500/20 border-gray-500/30', 
      light: 'from-gray-50 to-slate-50 border-gray-200',
      iconDark: 'text-gray-400',
      iconLight: 'text-gray-500'
    }
  },
  { 
    response: "worse", 
    icon: CloudRain, 
    key: "worse",
    color: { 
      dark: 'from-purple-500/20 to-indigo-500/20 border-purple-500/30', 
      light: 'from-purple-50 to-indigo-50 border-purple-200',
      iconDark: 'text-purple-400',
      iconLight: 'text-purple-500'
    }
  },
];

export const CheckinStep = ({ isDark, onSelect, onBack }: CheckinStepProps) => {
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

      {/* Question */}
      <h2 className={`text-xl font-semibold mb-2 ${
        isDark ? 'text-white' : 'text-gray-800'
      }`}>
        {t('crisis.wizard.checkin.question')}
      </h2>

      <p className={`text-sm mb-8 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
        {t('crisis.wizard.checkin.subtitle')}
      </p>

      {/* Options */}
      <div className="flex gap-3 w-full max-w-sm justify-center">
        {checkinOptions.map((option, index) => {
          const Icon = option.icon;
          return (
            <motion.button
              key={option.response}
              onClick={() => onSelect(option.response)}
              whileHover={{ scale: 1.05, y: -4 }}
              whileTap={{ scale: 0.95 }}
              className={`flex-1 p-4 rounded-2xl border-2 bg-gradient-to-b transition-all duration-200 flex flex-col items-center gap-3 ${
                isDark ? option.color.dark : option.color.light
              }`}
            >
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                isDark ? 'bg-white/10' : 'bg-white shadow-sm'
              }`}>
                <Icon className={`w-7 h-7 ${isDark ? option.color.iconDark : option.color.iconLight}`} />
              </div>
              <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-700'}`}>
                {t(`crisis.wizard.checkin.${option.key}`)}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
