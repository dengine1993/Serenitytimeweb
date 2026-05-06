import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { MoodType } from "@/hooks/useMoodEntries";

interface ContextualNotePromptProps {
  selectedMood: MoodType | null;
  isLight?: boolean;
}

const moodPrompts: Record<MoodType, { ru: string; en: string }> = {
  joy: { ru: "Что принесло тебе радость сегодня?", en: "What brought you joy today?" },
  calm: { ru: "Как тебе удалось найти этот покой?", en: "How did you find this peace?" },
  neutral: { ru: "Что было заметным сегодня?", en: "What stood out today?" },
  anxiety: { ru: "Что сейчас занимает твои мысли?", en: "What's on your mind right now?" },
  sadness: { ru: "Что повлияло на твоё настроение?", en: "What shifted your mood?" },
  anger: { ru: "Что вызвало эту реакцию?", en: "What sparked this reaction?" },
  fatigue: { ru: "Чем был наполнен день?", en: "What filled your day?" },
  fear: { ru: "О чём ты сейчас думаешь?", en: "What are you thinking about?" },
};

export function ContextualNotePrompt({ selectedMood, isLight = false }: ContextualNotePromptProps) {
  const { language } = useI18n();
  
  if (!selectedMood) return null;
  
  const prompt = moodPrompts[selectedMood];
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={selectedMood}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="space-y-2"
      >
        <p className={`text-xs flex items-center gap-1.5 ${
          isLight ? "text-gray-500" : "text-white/50"
        }`}>
          <Sparkles className="w-3 h-3" />
          {language === 'ru' ? prompt.ru : prompt.en}
        </p>
      </motion.div>
    </AnimatePresence>
  );
}

export function getContextualPlaceholder(mood: MoodType | null, language: string): string {
  if (!mood) {
    return language === 'ru' ? 'Что хочешь запомнить?' : 'What do you want to remember?';
  }
  
  const prompt = moodPrompts[mood];
  return language === 'ru' ? prompt.ru : prompt.en;
}
