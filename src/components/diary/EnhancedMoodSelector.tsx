import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { MoodType } from "@/hooks/useMoodEntries";

interface MoodOption {
  value: MoodType;
  labelKey: string;
  emoji: string;
  color: string;
  bgLight: string;
  bgDark: string;
  glowColor: string;
}

const moodOptions: MoodOption[] = [
  { 
    value: "joy", 
    labelKey: "diary.moods.joy", 
    emoji: "☀️",
    color: "text-amber-500",
    bgLight: "bg-gradient-to-br from-amber-50 to-yellow-100",
    bgDark: "bg-gradient-to-br from-amber-500/20 to-yellow-500/10",
    glowColor: "rgba(251, 191, 36, 0.5)"
  },
  { 
    value: "calm", 
    labelKey: "diary.moods.calm", 
    emoji: "☁️",
    color: "text-sky-400",
    bgLight: "bg-gradient-to-br from-sky-50 to-blue-100",
    bgDark: "bg-gradient-to-br from-sky-500/20 to-blue-500/10",
    glowColor: "rgba(56, 189, 248, 0.5)"
  },
  { 
    value: "neutral", 
    labelKey: "diary.moods.neutral", 
    emoji: "😐",
    color: "text-slate-400",
    bgLight: "bg-gradient-to-br from-slate-50 to-gray-100",
    bgDark: "bg-gradient-to-br from-slate-500/20 to-gray-500/10",
    glowColor: "rgba(148, 163, 184, 0.5)"
  },
  { 
    value: "anxiety", 
    labelKey: "diary.moods.anxiety", 
    emoji: "🌊",
    color: "text-orange-500",
    bgLight: "bg-gradient-to-br from-orange-50 to-amber-100",
    bgDark: "bg-gradient-to-br from-orange-500/20 to-amber-500/10",
    glowColor: "rgba(249, 115, 22, 0.5)"
  },
  { 
    value: "sadness", 
    labelKey: "diary.moods.sadness", 
    emoji: "💧",
    color: "text-indigo-400",
    bgLight: "bg-gradient-to-br from-indigo-50 to-purple-100",
    bgDark: "bg-gradient-to-br from-indigo-500/20 to-purple-500/10",
    glowColor: "rgba(129, 140, 248, 0.5)"
  },
  { 
    value: "anger", 
    labelKey: "diary.moods.anger", 
    emoji: "🔥",
    color: "text-red-500",
    bgLight: "bg-gradient-to-br from-red-50 to-orange-100",
    bgDark: "bg-gradient-to-br from-red-500/20 to-orange-500/10",
    glowColor: "rgba(239, 68, 68, 0.5)"
  },
  { 
    value: "fatigue", 
    labelKey: "diary.moods.fatigue", 
    emoji: "🌙",
    color: "text-purple-400",
    bgLight: "bg-gradient-to-br from-purple-50 to-indigo-100",
    bgDark: "bg-gradient-to-br from-purple-500/20 to-indigo-500/10",
    glowColor: "rgba(168, 85, 247, 0.5)"
  },
  { 
    value: "fear", 
    labelKey: "diary.moods.fear", 
    emoji: "😨",
    color: "text-cyan-400",
    bgLight: "bg-gradient-to-br from-cyan-50 to-teal-100",
    bgDark: "bg-gradient-to-br from-cyan-500/20 to-teal-500/10",
    glowColor: "rgba(34, 211, 238, 0.5)"
  },
];

interface EnhancedMoodSelectorProps {
  selectedMood: MoodType | null;
  onSelect: (mood: MoodType) => void;
  isLight?: boolean;
}

export function EnhancedMoodSelector({ selectedMood, onSelect, isLight = false }: EnhancedMoodSelectorProps) {
  const { t } = useI18n();
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative overflow-visible">
      <div ref={scrollRef} className="pb-1">
        {/* 2 rows of 4 on mobile, single row on desktop */}
        <div className="grid grid-cols-4 gap-1.5 sm:flex sm:gap-2 lg:gap-3">
          {moodOptions.map((mood, index) => {
            const isSelected = selectedMood === mood.value;
            
            return (
            <motion.button
              key={mood.value}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
                onClick={() => onSelect(mood.value)}
                className={`
                  relative flex flex-col items-center gap-1 sm:gap-1.5 
                  p-2 sm:p-3 lg:p-4 
                  rounded-xl sm:rounded-2xl border-2 transition-all
                  sm:flex-1 sm:min-w-0
                  ${isSelected
                    ? `border-${mood.value === 'joy' ? 'amber' : mood.value === 'calm' ? 'sky' : mood.value === 'anxiety' ? 'orange' : mood.value === 'sadness' ? 'indigo' : 'red'}-400 ${isLight ? mood.bgLight : mood.bgDark} shadow-xl`
                    : isLight
                      ? "bg-white/80 border-gray-200/60 shadow-md hover:shadow-lg hover:border-gray-300"
                      : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                  }
                `}
                style={{
                  boxShadow: isSelected ? `0 8px 32px -4px ${mood.glowColor}` : undefined
                }}
              >
                {/* Selection checkmark */}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className={`absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 rounded-full flex items-center justify-center shadow-lg ${
                      isLight ? "bg-white" : "bg-background"
                    }`}
                  >
                    <Check className={`w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-3.5 lg:h-3.5 ${mood.color}`} />
                  </motion.div>
                )}
                
                {/* Emoji with glow */}
                <motion.div 
                  className="relative"
                  animate={isSelected ? { scale: 1.1 } : { scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Glow effect */}
                  <motion.div
                    className="absolute inset-0 rounded-full blur-md"
                    animate={isSelected ? {
                      opacity: [0.5, 0.8, 0.5],
                      scale: [1, 1.3, 1],
                    } : { opacity: 0.3 }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{ backgroundColor: mood.glowColor }}
                  />
                  <span className="relative text-xl sm:text-2xl lg:text-3xl filter drop-shadow-sm">
                    {mood.emoji}
                  </span>
                </motion.div>
                
                {/* Label */}
                <span className={`
                  text-[9px] sm:text-[10px] lg:text-xs font-medium whitespace-nowrap
                  ${isSelected
                    ? mood.color
                    : isLight 
                      ? "text-gray-700" 
                      : "text-white/80"
                  }
                `}>
                  {t(mood.labelKey)}
                </span>
                
                {/* Pulse animation for selected */}
                {isSelected && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl"
                    animate={{
                      boxShadow: [
                        `0 0 0 0 ${mood.glowColor}`,
                        `0 0 0 8px transparent`,
                      ],
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function getEnhancedMoodInfo(mood: MoodType) {
  return moodOptions.find(m => m.value === mood);
}

export { moodOptions as enhancedMoodOptions };
