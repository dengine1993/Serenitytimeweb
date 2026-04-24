import { motion, AnimatePresence } from "framer-motion";
import { Heart, Calendar } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { differenceInDays, parseISO } from "date-fns";
import type { MoodEntry } from "@/hooks/useMoodEntries";

interface StreakGraceMessageProps {
  entries: MoodEntry[];
  isLight?: boolean;
}

export function StreakGraceMessage({ entries, isLight = false }: StreakGraceMessageProps) {
  const { language } = useI18n();
  
  // Check if user missed yesterday but had previous streak
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  
  // Find if there's entry for today, yesterday, and 2 days ago
  const hasToday = entries.some(e => {
    const entryDate = parseISO(e.entry_date);
    entryDate.setHours(0, 0, 0, 0);
    return entryDate.getTime() === today.getTime();
  });
  
  const hasYesterday = entries.some(e => {
    const entryDate = parseISO(e.entry_date);
    entryDate.setHours(0, 0, 0, 0);
    return entryDate.getTime() === yesterday.getTime();
  });
  
  const hasTwoDaysAgo = entries.some(e => {
    const entryDate = parseISO(e.entry_date);
    entryDate.setHours(0, 0, 0, 0);
    return entryDate.getTime() === twoDaysAgo.getTime();
  });
  
  // Show message only if: no today, no yesterday, but had 2 days ago (missed 1 day)
  const showGrace = !hasToday && !hasYesterday && hasTwoDaysAgo;
  
  if (!showGrace) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className={`rounded-2xl p-4 mb-4 ${
          isLight 
            ? "bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60" 
            : "bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20"
        }`}
      >
        <div className="flex items-start gap-3">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`p-2 rounded-full ${
              isLight ? "bg-amber-100" : "bg-amber-500/20"
            }`}
          >
            <Heart className="w-5 h-5 text-amber-500" />
          </motion.div>
          
          <div className="flex-1">
            <p className={`text-sm font-medium mb-1 ${
              isLight ? "text-amber-800" : "text-amber-300"
            }`}>
              {language === 'ru' 
                ? 'Ты вчера отдыхал(а) от дневника — это нормально!' 
                : 'You took a break yesterday — that\'s okay!'}
            </p>
            <p className={`text-xs ${
              isLight ? "text-amber-700/80" : "text-amber-300/70"
            }`}>
              {language === 'ru' 
                ? 'Забота о себе важнее цифр. Как ты сегодня?' 
                : 'Self-care matters more than numbers. How are you today?'}
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
