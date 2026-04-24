import { motion } from "framer-motion";
import { CalendarDays, Flame, TrendingUp, FileText } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { Progress } from "@/components/ui/progress";
import { getMoodInfo } from "./MoodSelector";
import type { MoodStats } from "@/hooks/useMoodEntries";

interface DiaryStatsProps {
  stats: MoodStats;
  totalEntries: number;
  isLight: boolean;
}

export function DiaryStats({ stats, totalEntries, isLight }: DiaryStatsProps) {
  const { t } = useI18n();
  const weeklyProgress = (stats.weeklyCount / 7) * 100;

  const statItems = [
    {
      icon: CalendarDays,
      label: t('diary.weeklyEntries'),
      value: `${stats.weeklyCount}/7`,
      progress: weeklyProgress,
      showProgress: true,
      color: "text-blue-500",
      bgColor: isLight ? "bg-blue-50" : "bg-blue-500/10"
    },
    {
      icon: Flame,
      label: t('diary.streak'),
      value: `${stats.streak} ${t('diary.days')}`,
      showFlame: stats.streak >= 3,
      color: "text-orange-500",
      bgColor: isLight ? "bg-orange-50" : "bg-orange-500/10"
    },
    {
      icon: TrendingUp,
      label: t('diary.averageMood'),
      value: stats.averageMood ? t(`diary.moods.${stats.averageMood}`) : t('diary.fillThreeEntries') || 'Заполни 3 записи',
      moodIcon: stats.averageMood ? getMoodInfo(stats.averageMood) : null,
      isEmpty: !stats.averageMood,
      color: "text-green-500",
      bgColor: isLight ? "bg-green-50" : "bg-green-500/10"
    },
    {
      icon: FileText,
      label: t('diary.totalEntries'),
      value: totalEntries.toString(),
      color: "text-purple-500",
      bgColor: isLight ? "bg-purple-50" : "bg-purple-500/10"
    }
  ];

  return (
    <div className="space-y-3">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {statItems.map((item, index) => {
        const Icon = item.icon;
        const MoodIcon = item.moodIcon?.icon;
        
        return (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-3 rounded-xl ${
              isLight 
                ? "bg-white border border-gray-100 shadow-sm" 
                : "bg-white/5 border border-white/10"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg ${item.bgColor}`}>
                <Icon className={`w-4 h-4 ${item.color}`} />
              </div>
              <span className={`text-xs ${isLight ? "text-gray-500" : "text-white/60"}`}>
                {item.label}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold ${
                (item as any).isEmpty 
                  ? (isLight ? "text-gray-400 text-sm" : "text-white/65 text-sm")
                  : (isLight ? "text-gray-900" : "text-white")
              }`}>
                {item.value}
              </span>
              {item.showFlame && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <Flame className="w-4 h-4 text-orange-500" />
                </motion.div>
              )}
              {MoodIcon && (
                <MoodIcon className={`w-4 h-4 ${item.moodIcon?.colorClass}`} />
              )}
            </div>
            
            {item.showProgress && (
              <Progress value={item.progress} className="h-1.5 mt-2" />
            )}
          </motion.div>
        );
      })}
      </div>
    </div>
  );
}