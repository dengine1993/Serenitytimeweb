import { motion } from "framer-motion";
import { Award, Flame, Star, Trophy, Heart, Sparkles, Lock } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { Progress } from "@/components/ui/progress";
import type { MoodStats } from "@/hooks/useMoodEntries";

interface Badge {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  lightBg: string;
  unlocked: boolean;
  progress?: number;
  target?: number;
  current?: number;
}

interface MoodBadgesProps {
  stats: MoodStats;
  totalEntries: number;
  isLight: boolean;
}

export function MoodBadges({ stats, totalEntries, isLight }: MoodBadgesProps) {
  const { t } = useI18n();

  const badges: Badge[] = [
    {
      id: "firstStep",
      icon: Heart,
      color: "text-pink-500",
      bgColor: "bg-pink-500/20",
      lightBg: "bg-pink-50 border-pink-200",
      unlocked: totalEntries >= 1,
      current: totalEntries,
      target: 1,
      progress: Math.min(100, (totalEntries / 1) * 100)
    },
    {
      id: "threeDays",
      icon: Flame,
      color: "text-orange-500",
      bgColor: "bg-orange-500/20",
      lightBg: "bg-orange-50 border-orange-200",
      unlocked: stats.streak >= 3,
      current: stats.streak,
      target: 3,
      progress: Math.min(100, (stats.streak / 3) * 100)
    },
    {
      id: "weekStreak",
      icon: Star,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/20",
      lightBg: "bg-yellow-50 border-yellow-200",
      unlocked: stats.streak >= 7,
      current: stats.streak,
      target: 7,
      progress: Math.min(100, (stats.streak / 7) * 100)
    },
    {
      id: "tenEntries",
      icon: Award,
      color: "text-blue-500",
      bgColor: "bg-blue-500/20",
      lightBg: "bg-blue-50 border-blue-200",
      unlocked: totalEntries >= 10,
      current: totalEntries,
      target: 10,
      progress: Math.min(100, (totalEntries / 10) * 100)
    },
    {
      id: "monthCare",
      icon: Trophy,
      color: "text-purple-500",
      bgColor: "bg-purple-500/20",
      lightBg: "bg-purple-50 border-purple-200",
      unlocked: totalEntries >= 30,
      current: totalEntries,
      target: 30,
      progress: Math.min(100, (totalEntries / 30) * 100)
    },
    {
      id: "dedicated",
      icon: Sparkles,
      color: "text-teal-500",
      bgColor: "bg-teal-500/20",
      lightBg: "bg-teal-50 border-teal-200",
      unlocked: stats.streak >= 14,
      current: stats.streak,
      target: 14,
      progress: Math.min(100, (stats.streak / 14) * 100)
    }
  ];

  const unlockedBadges = badges.filter(b => b.unlocked);
  const lockedBadges = badges.filter(b => !b.unlocked);
  const nextBadge = lockedBadges[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className={`text-base font-semibold ${isLight ? "text-gray-900" : "text-foreground"}`}>
          {t('diary.badges.title')}
        </h3>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
          isLight ? "bg-primary/10 text-primary" : "bg-primary/20 text-primary"
        }`}>
          {unlockedBadges.length}/{badges.length}
        </span>
      </div>
      
      {/* Unlocked badges */}
      {unlockedBadges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {unlockedBadges.map((badge, index) => {
            const Icon = badge.icon;
            return (
              <motion.div
                key={badge.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1, type: "spring", stiffness: 200 }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
                  isLight 
                    ? badge.lightBg
                    : badge.bgColor + " border-transparent"
                }`}
              >
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${badge.color}`} />
                <span className={`text-xs sm:text-sm font-medium ${badge.color}`}>
                  {t(`diary.badges.${badge.id}`)}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Next badge progress */}
      {nextBadge && (
        <div className={`p-3 rounded-xl border ${
          isLight ? "bg-white border-primary/20" : "bg-white/5 border border-white/10"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${isLight ? nextBadge.bgColor : "bg-white/10"}`}>
                <nextBadge.icon className={`w-4 h-4 ${isLight ? nextBadge.color : "text-white/65"}`} />
              </div>
              <span className={`text-sm font-medium ${isLight ? "text-gray-700" : "text-white/80"}`}>
                {t(`diary.badges.${nextBadge.id}`)}
              </span>
            </div>
            <span className={`text-xs ${isLight ? "text-gray-500" : "text-white/50"}`}>
              {nextBadge.current}/{nextBadge.target}
            </span>
          </div>
          <Progress value={nextBadge.progress} className="h-2" />
        </div>
      )}

      {/* Locked badges preview - with tooltip showing progress */}
      {lockedBadges.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {lockedBadges.slice(1, 5).map((badge) => {
            const Icon = badge.icon;
            const remaining = (badge.target || 0) - (badge.current || 0);
            return (
              <div
                key={badge.id}
                title={t('diary.badges.daysRemaining', { days: remaining })}
                className={`group relative flex items-center gap-2 px-3 py-2 rounded-xl border opacity-70 hover:opacity-90 transition-opacity cursor-help ${
                  isLight 
                    ? "bg-white border-gray-200/50" 
                    : "bg-white/5 border border-white/10"
                }`}
              >
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isLight ? badge.color + " opacity-40" : "text-white/60"}`} />
                <span className={`text-xs sm:text-sm font-medium ${isLight ? "text-gray-400" : "text-white/65"}`}>
                  {t(`diary.badges.${badge.id}`)}
                </span>
                <Lock className={`w-3.5 h-3.5 ${isLight ? "text-gray-300" : "text-white/60"}`} />
                
                {/* Tooltip */}
                <div className={`absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 ${
                  isLight ? "bg-gray-800 text-white" : "bg-white text-gray-900"
                }`}>
                  {t('diary.badges.daysRemaining', { days: remaining })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
