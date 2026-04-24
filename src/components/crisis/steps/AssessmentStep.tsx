import { motion } from "framer-motion";
import { ArrowLeft, AlertTriangle, Flame, CloudRain, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";
import type { AnxietyLevel } from "../CrisisWizard";

interface AssessmentStepProps {
  isDark: boolean;
  onSelect: (level: AnxietyLevel) => void;
  onEmergency: () => void;
  onBack: () => void;
}

const anxietyOptions: { 
  level: AnxietyLevel; 
  icon: typeof Flame; 
  key: string;
  descKey: string;
  color: { dark: string; light: string; iconDark: string; iconLight: string };
}[] = [
  { 
    level: "high", 
    icon: Flame, 
    key: "high",
    descKey: "highDesc",
    color: { 
      dark: 'from-red-500/20 to-orange-500/20 border-red-500/30 hover:border-red-400/50', 
      light: 'from-red-50 to-orange-50 border-red-200 hover:border-red-300',
      iconDark: 'text-red-400',
      iconLight: 'text-red-500'
    }
  },
  { 
    level: "medium", 
    icon: CloudRain, 
    key: "medium",
    descKey: "mediumDesc",
    color: { 
      dark: 'from-amber-500/20 to-yellow-500/20 border-amber-500/30 hover:border-amber-400/50', 
      light: 'from-amber-50 to-yellow-50 border-amber-200 hover:border-amber-300',
      iconDark: 'text-amber-400',
      iconLight: 'text-amber-500'
    }
  },
  { 
    level: "low", 
    icon: Droplets, 
    key: "low",
    descKey: "lowDesc",
    color: { 
      dark: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 hover:border-blue-400/50', 
      light: 'from-blue-50 to-cyan-50 border-blue-200 hover:border-blue-300',
      iconDark: 'text-blue-400',
      iconLight: 'text-blue-500'
    }
  },
];

export const AssessmentStep = ({ isDark, onSelect, onEmergency, onBack }: AssessmentStepProps) => {
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
      <h2 className={`text-xl font-semibold mb-8 ${
        isDark ? 'text-white' : 'text-gray-800'
      }`}>
        {t('crisis.wizard.assessment.question')}
      </h2>

      {/* Options */}
      <div className="flex flex-col gap-4 w-full max-w-sm">
        {anxietyOptions.map((option, index) => {
          const Icon = option.icon;
          return (
            <motion.button
              key={option.level}
              onClick={() => onSelect(option.level)}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full p-5 rounded-2xl border-2 bg-gradient-to-r transition-all duration-200 flex items-center gap-4 ${
                isDark ? option.color.dark : option.color.light
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                isDark ? 'bg-white/10' : 'bg-white shadow-sm'
              }`}>
                <Icon className={`w-6 h-6 ${isDark ? option.color.iconDark : option.color.iconLight}`} />
              </div>
              <div className="flex flex-col items-start text-left">
                <span className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-700'}`}>
                  {t(`crisis.wizard.assessment.${option.key}`)}
                </span>
                <span className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                  {t(`crisis.wizard.assessment.${option.descKey}`)}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Emergency button */}
      <motion.button
        onClick={onEmergency}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`mt-8 flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all ${
          isDark 
            ? 'bg-red-500/10 text-red-300 hover:bg-red-500/20 border border-red-500/20' 
            : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100'
        }`}
      >
        <AlertTriangle className="w-4 h-4" />
        {t('crisis.wizard.assessment.emergency')}
      </motion.button>
    </div>
  );
};
