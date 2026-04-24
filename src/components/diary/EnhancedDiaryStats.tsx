import { motion } from "framer-motion";
import { CalendarDays, Flame, TrendingUp, FileText } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { Progress } from "@/components/ui/progress";
import type { MoodStats, MoodType } from "@/hooks/useMoodEntries";

interface EnhancedDiaryStatsProps {
  stats: MoodStats;
  totalEntries: number;
  isLight: boolean;
}

const MOOD_EMOJI: Record<MoodType, string> = {
  joy: "☀️",
  calm: "☁️",
  neutral: "😐",
  anxiety: "🌊",
  sadness: "💧",
  anger: "🔥",
  fatigue: "😴",
  fear: "😨"
};

export function EnhancedDiaryStats({ stats, totalEntries, isLight }: EnhancedDiaryStatsProps) {
  const { t, language } = useI18n();
  const weeklyProgress = (stats.weeklyCount / 7) * 100;

  const statItems = [
    {
      icon: CalendarDays,
      label: language === 'ru' ? 'За неделю' : 'Weekly',
      value: `${stats.weeklyCount}/7`,
      progress: weeklyProgress,
      showProgress: true,
      color: "text-sky-500",
      bgGradient: isLight 
        ? "bg-gradient-to-br from-sky-50 to-blue-100" 
        : "bg-gradient-to-br from-sky-500/15 to-blue-500/5",
      glowColor: "rgba(14, 165, 233, 0.3)"
    },
    {
      icon: Flame,
      label: language === 'ru' ? 'Серия' : 'Streak',
      value: `${stats.streak}`,
      suffix: language === 'ru' ? ' дн.' : 'd',
      showFlame: stats.streak >= 3,
      color: "text-orange-500",
      bgGradient: isLight 
        ? "bg-gradient-to-br from-orange-50 to-amber-100" 
        : "bg-gradient-to-br from-orange-500/15 to-amber-500/5",
      glowColor: "rgba(249, 115, 22, 0.3)"
    },
    {
      icon: TrendingUp,
      label: language === 'ru' ? 'Среднее' : 'Average',
      value: stats.averageMood 
        ? MOOD_EMOJI[stats.averageMood]
        : '—',
      subtext: stats.averageMood 
        ? t(`diary.moods.${stats.averageMood}`) 
        : undefined,
      isEmpty: !stats.averageMood,
      color: "text-emerald-500",
      bgGradient: isLight 
        ? "bg-gradient-to-br from-emerald-50 to-green-100" 
        : "bg-gradient-to-br from-emerald-500/15 to-green-500/5",
      glowColor: "rgba(16, 185, 129, 0.3)"
    },
    {
      icon: FileText,
      label: language === 'ru' ? 'Всего' : 'Total',
      value: totalEntries.toString(),
      color: "text-violet-500",
      bgGradient: isLight 
        ? "bg-gradient-to-br from-violet-50 to-purple-100" 
        : "bg-gradient-to-br from-violet-500/15 to-purple-500/5",
      glowColor: "rgba(139, 92, 246, 0.3)"
    }
  ];

  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-4 sm:gap-3">
      {statItems.map((item, index) => {
        const Icon = item.icon;
        
        return (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: index * 0.08, type: "spring", stiffness: 200 }}
            whileHover={{ scale: 1.02, y: -2 }}
            className={`relative p-2 sm:p-4 rounded-xl sm:rounded-2xl border overflow-hidden ${
              isLight 
                ? `${item.bgGradient} border-white/60 shadow-md` 
                : `${item.bgGradient} border-white/10`
            }`}
            style={{
              boxShadow: isLight ? `0 4px 20px -4px ${item.glowColor}` : undefined
            }}
          >
            {/* Background glow - hidden on mobile */}
            <div 
              className="absolute -top-8 -right-8 w-20 h-20 rounded-full blur-2xl opacity-40 hidden sm:block"
              style={{ backgroundColor: item.glowColor }}
            />
            
            <div className="relative">
              {/* Icon + label row - compact on mobile */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 mb-1 sm:mb-2">
                <div className={`p-1 sm:p-1.5 rounded-lg ${isLight ? 'bg-white/60' : 'bg-black/20'} w-fit`}>
                  <Icon className={`w-3 h-3 sm:w-4 sm:h-4 ${item.color}`} />
                </div>
                <span className={`text-[9px] sm:text-xs font-medium leading-tight ${isLight ? "text-gray-600" : "text-white/60"}`}>
                  {item.label}
                </span>
              </div>
              
              {/* Value */}
              <div className="flex items-baseline gap-0.5 sm:gap-1">
                <span className={`text-lg sm:text-2xl font-bold ${
                  (item as any).isEmpty 
                    ? (isLight ? "text-gray-400" : "text-white/65")
                    : (isLight ? "text-gray-900" : "text-white")
                }`}>
                  {item.value}
                </span>
                {(item as any).suffix && (
                  <span className={`text-[10px] sm:text-sm ${isLight ? "text-gray-500" : "text-white/50"}`}>
                    {(item as any).suffix}
                  </span>
                )}
                {(item as any).showFlame && (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="hidden sm:block"
                  >
                    <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 ml-0.5" />
                  </motion.div>
                )}
              </div>
              
              {/* Subtext - hidden on very small screens */}
              {(item as any).subtext && (
                <p className={`text-[9px] sm:text-xs mt-0.5 truncate ${
                  (item as any).isEmpty 
                    ? (isLight ? "text-gray-400" : "text-white/65")
                    : (isLight ? "text-gray-500" : "text-white/50")
                }`}>
                  {(item as any).subtext}
                </p>
              )}
              
              {/* Progress bar */}
              {item.showProgress && (
                <div className="mt-1.5 sm:mt-2.5">
                  <Progress value={item.progress} className="h-1 sm:h-1.5 rounded-full" />
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
