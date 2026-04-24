import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { ru, enUS } from "date-fns/locale";
import { Star } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { MoodEntry, MoodType } from "@/hooks/useMoodEntries";
import { getMoodInfo } from "./MoodSelector";

interface BestDayCardProps {
  entries: MoodEntry[];
  isLight: boolean;
}

const MOOD_SCORES: Record<MoodType, number> = {
  joy: 5,
  calm: 4,
  neutral: 3,
  fatigue: 3,
  anxiety: 2,
  sadness: 2,
  anger: 1,
  fear: 1
};

export function BestDayCard({ entries, isLight }: BestDayCardProps) {
  const { t, language } = useI18n();
  const locale = language === 'ru' ? ru : enUS;

  const bestDay = useMemo(() => {
    if (entries.length === 0) return null;
    
    // Find entries with highest mood scores
    const sortedByMood = [...entries].sort((a, b) => {
      const scoreA = MOOD_SCORES[a.mood];
      const scoreB = MOOD_SCORES[b.mood];
      if (scoreB !== scoreA) return scoreB - scoreA;
      // If same score, prefer entries with notes
      if (b.note && !a.note) return 1;
      if (a.note && !b.note) return -1;
      return 0;
    });

    return sortedByMood[0];
  }, [entries]);

  if (!bestDay) return null;

  const moodInfo = getMoodInfo(bestDay.mood);
  const Icon = moodInfo?.icon;

  return (
    <div className={`p-3 rounded-xl ${
      isLight ? "bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-100" : "bg-amber-500/10 border border-amber-500/20"
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <Star className="w-4 h-4 text-amber-500" />
        <span className={`text-sm font-medium ${isLight ? "text-amber-700" : "text-amber-400"}`}>
          {t('diary.bestDay.title')}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${isLight ? "bg-amber-100/50" : "bg-amber-500/20"}`}>
          {Icon && <Icon className={`w-5 h-5 ${moodInfo?.colorClass}`} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-foreground"}`}>
            {format(new Date(bestDay.entry_date), "d MMMM", { locale })}
          </p>
          {bestDay.note && (
            <p className={`text-xs truncate ${isLight ? "text-gray-600" : "text-muted-foreground"}`}>
              {bestDay.note}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
