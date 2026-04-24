import { motion } from "framer-motion";
import { Smile, Cloud, AlertCircle, Frown, Zap, Check } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { MoodType } from "@/hooks/useMoodEntries";

interface MoodOption {
  value: MoodType;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  bgSelected: string;
  borderSelected: string;
}

// Core 5 emotions for simplicity (research shows 5-7 is optimal for choice)
const moodOptions: MoodOption[] = [
  { value: "joy", labelKey: "diary.moods.joy", icon: Smile, colorClass: "text-green-500", bgSelected: "bg-green-500/20", borderSelected: "border-green-500" },
  { value: "calm", labelKey: "diary.moods.calm", icon: Cloud, colorClass: "text-blue-400", bgSelected: "bg-blue-400/20", borderSelected: "border-blue-400" },
  { value: "anxiety", labelKey: "diary.moods.anxiety", icon: AlertCircle, colorClass: "text-orange-500", bgSelected: "bg-orange-500/20", borderSelected: "border-orange-500" },
  { value: "sadness", labelKey: "diary.moods.sadness", icon: Frown, colorClass: "text-indigo-400", bgSelected: "bg-indigo-400/20", borderSelected: "border-indigo-400" },
  { value: "anger", labelKey: "diary.moods.anger", icon: Zap, colorClass: "text-red-500", bgSelected: "bg-red-500/20", borderSelected: "border-red-500" },
];

interface MoodSelectorProps {
  selectedMood: MoodType | null;
  onSelect: (mood: MoodType) => void;
  isLight?: boolean;
}

export function MoodSelector({ selectedMood, onSelect, isLight = false }: MoodSelectorProps) {
  const { t } = useI18n();

  return (
    <div className="overflow-x-auto -mx-2 px-2 pb-2 scrollbar-hide">
      <div className="flex gap-2 min-w-max pr-4">
        {moodOptions.map((mood, index) => {
          const Icon = mood.icon;
          const isSelected = selectedMood === mood.value;
          
          return (
            <motion.button
              key={mood.value}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelect(mood.value)}
              className={`
                relative flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl border-2 transition-all
                min-w-[72px] sm:min-w-[85px]
                ${isSelected
                  ? `${mood.borderSelected} ${mood.bgSelected} shadow-lg scale-105`
                  : isLight
                    ? "bg-white border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300"
                    : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                }
              `}
            >
              {/* Checkmark for selected state */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center ${
                    isLight ? "bg-white shadow-md" : "bg-background"
                  }`}
                >
                  <Check className={`w-3 h-3 ${mood.colorClass}`} />
                </motion.div>
              )}
              
              <motion.div 
                className={`
                  p-2.5 sm:p-3 rounded-xl transition-all
                  ${isSelected 
                    ? mood.bgSelected
                    : isLight 
                      ? "bg-gray-50" 
                      : "bg-white/5"
                  }
                `}
                animate={isSelected ? { scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 0.4, type: "spring" }}
                style={{
                  filter: `drop-shadow(0 0 ${isSelected ? '8px' : '4px'} ${
                    mood.value === 'joy' ? '#22c55e' :
                    mood.value === 'calm' ? '#60a5fa' :
                    mood.value === 'anxiety' ? '#f97316' :
                    mood.value === 'sadness' ? '#818cf8' :
                    '#ef4444'
                  })`
                }}
              >
                {/* Icons are ALWAYS colored with glow effect */}
                <Icon className={`w-6 h-6 sm:w-7 sm:h-7 ${mood.colorClass}`} />
              </motion.div>
              <span className={`
                text-xs sm:text-sm font-medium whitespace-nowrap
                ${isSelected
                  ? mood.colorClass
                  : isLight 
                    ? "text-gray-700" 
                    : "text-white/80"
                }
              `}>
                {t(mood.labelKey)}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export function getMoodInfo(mood: MoodType) {
  return moodOptions.find(m => m.value === mood);
}

export { moodOptions };
