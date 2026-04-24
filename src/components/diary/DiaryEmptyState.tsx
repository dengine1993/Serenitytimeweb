import { motion } from "framer-motion";
import { BookOpen, Sparkles } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

interface DiaryEmptyStateProps {
  isLight?: boolean;
}

export function DiaryEmptyState({ isLight = false }: DiaryEmptyStateProps) {
  const { t, language } = useI18n();
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center justify-center py-8 px-4 text-center rounded-2xl ${
        isLight ? "bg-primary/5" : "bg-primary/10"
      }`}
    >
      <motion.div
        animate={{ 
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0]
        }}
        transition={{ duration: 4, repeat: Infinity }}
        className={`p-4 rounded-full mb-4 ${
          isLight ? "bg-primary/10" : "bg-primary/20"
        }`}
      >
        <BookOpen className="w-8 h-8 text-primary" />
      </motion.div>
      
      <h3 className={`text-lg font-bold mb-2 ${
        isLight ? "text-gray-900" : "text-white"
      }`}>
        {language === 'ru' ? 'Твой дневник ждёт тебя' : 'Your diary awaits'}
      </h3>
      
      <p className={`text-sm max-w-xs mb-4 ${
        isLight ? "text-gray-600" : "text-white/70"
      }`}>
        {language === 'ru' 
          ? 'Первая запись — это маленький шаг к пониманию себя. Как ты себя чувствуешь сегодня?' 
          : 'The first entry is a small step toward understanding yourself. How are you feeling today?'}
      </p>
      
      <motion.div
        className="flex items-center gap-1.5 text-primary text-sm font-medium"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Sparkles className="w-4 h-4" />
        {language === 'ru' ? 'Выбери настроение выше' : 'Choose a mood above'}
      </motion.div>
    </motion.div>
  );
}
