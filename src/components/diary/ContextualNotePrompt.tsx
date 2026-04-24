import { motion, AnimatePresence } from "framer-motion";
import { Heart, Sparkles } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { MoodType } from "@/hooks/useMoodEntries";

interface ContextualNotePromptProps {
  selectedMood: MoodType | null;
  isLight?: boolean;
}

// Contextual prompts based on selected mood
const moodPrompts: Record<MoodType, { ru: string; en: string }> = {
  joy: { ru: "Что принесло тебе радость сегодня?", en: "What brought you joy today?" },
  calm: { ru: "Как тебе удалось найти покой?", en: "How did you find this peace?" },
  neutral: { ru: "Как прошёл твой день?", en: "How was your day?" },
  anxiety: { ru: "Что тебя тревожит? Запиши — станет легче.", en: "What's worrying you? Writing helps." },
  sadness: { ru: "Что тебя расстроило? Твои чувства важны.", en: "What made you sad? Your feelings matter." },
  anger: { ru: "Что вызвало злость? Ты имеешь право чувствовать.", en: "What caused this anger? You have the right to feel." },
  fatigue: { ru: "Чем был наполнен день? Отдых тоже важен.", en: "What filled your day? Rest matters too." },
  fear: { ru: "Чего ты боишься? Записать — первый шаг к преодолению.", en: "What are you afraid of? Writing is the first step." },
};

// Validation messages for negative emotions
const validationMessages: Record<string, { ru: string; en: string }> = {
  anxiety: { ru: "Тревога пройдёт. Ты справляешься.", en: "The anxiety will pass. You're handling it." },
  sadness: { ru: "Грустить — нормально. Ты не один(а).", en: "It's okay to feel sad. You're not alone." },
  anger: { ru: "Твои чувства обоснованы. Выдохни.", en: "Your feelings are valid. Take a breath." },
  fear: { ru: "Страх — это сигнал, не враг.", en: "Fear is a signal, not an enemy." },
  fatigue: { ru: "Отдых — это не слабость.", en: "Rest is not weakness." },
};

export function ContextualNotePrompt({ selectedMood, isLight = false }: ContextualNotePromptProps) {
  const { language } = useI18n();
  
  if (!selectedMood) return null;
  
  const prompt = moodPrompts[selectedMood];
  const validation = validationMessages[selectedMood];
  const isNegative = ['anxiety', 'sadness', 'anger', 'fear', 'fatigue'].includes(selectedMood);
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={selectedMood}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="space-y-2"
      >
        {/* Contextual prompt */}
        <p className={`text-xs flex items-center gap-1.5 ${
          isLight ? "text-gray-500" : "text-white/50"
        }`}>
          <Sparkles className="w-3 h-3" />
          {language === 'ru' ? prompt.ru : prompt.en}
        </p>
        
        {/* Validation message for negative emotions */}
        {isNegative && validation && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${
              isLight 
                ? "bg-rose-50 text-rose-700 border border-rose-100" 
                : "bg-rose-500/10 text-rose-300 border border-rose-500/20"
            }`}
          >
            <Heart className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{language === 'ru' ? validation.ru : validation.en}</span>
          </motion.div>
        )}
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
