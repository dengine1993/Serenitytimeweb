import { motion, AnimatePresence } from "framer-motion";
import { Award, Flame, Star, Trophy, Heart, Sparkles, Lock, Crown, Zap } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { Progress } from "@/components/ui/progress";
import type { MoodStats } from "@/hooks/useMoodEntries";

interface Badge {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgGradient: string;
  glowColor: string;
  unlocked: boolean;
  progress: number;
  current: number;
  target: number;
}

interface EnhancedMoodBadgesProps {
  stats: MoodStats;
  totalEntries: number;
  isLight: boolean;
  onBadgeUnlock?: (badgeId: string) => void;
}

export function EnhancedMoodBadges({ stats, totalEntries, isLight }: EnhancedMoodBadgesProps) {
  const { t, language } = useI18n();

  const badges: Badge[] = [
    {
      id: "firstStep",
      icon: Heart,
      color: "text-pink-500",
      bgGradient: isLight 
        ? "bg-gradient-to-br from-pink-50 to-rose-100" 
        : "bg-gradient-to-br from-pink-500/20 to-rose-500/10",
      glowColor: "rgba(236, 72, 153, 0.4)",
      unlocked: totalEntries >= 1,
      current: Math.min(totalEntries, 1),
      target: 1,
      progress: Math.min(100, (totalEntries / 1) * 100)
    },
    {
      id: "threeDays",
      icon: Flame,
      color: "text-orange-500",
      bgGradient: isLight 
        ? "bg-gradient-to-br from-orange-50 to-amber-100" 
        : "bg-gradient-to-br from-orange-500/20 to-amber-500/10",
      glowColor: "rgba(249, 115, 22, 0.4)",
      unlocked: stats.streak >= 3,
      current: Math.min(stats.streak, 3),
      target: 3,
      progress: Math.min(100, (stats.streak / 3) * 100)
    },
    {
      id: "weekStreak",
      icon: Star,
      color: "text-yellow-500",
      bgGradient: isLight 
        ? "bg-gradient-to-br from-yellow-50 to-amber-100" 
        : "bg-gradient-to-br from-yellow-500/20 to-amber-500/10",
      glowColor: "rgba(234, 179, 8, 0.4)",
      unlocked: stats.streak >= 7,
      current: Math.min(stats.streak, 7),
      target: 7,
      progress: Math.min(100, (stats.streak / 7) * 100)
    },
    {
      id: "tenEntries",
      icon: Award,
      color: "text-blue-500",
      bgGradient: isLight 
        ? "bg-gradient-to-br from-blue-50 to-sky-100" 
        : "bg-gradient-to-br from-blue-500/20 to-sky-500/10",
      glowColor: "rgba(59, 130, 246, 0.4)",
      unlocked: totalEntries >= 10,
      current: Math.min(totalEntries, 10),
      target: 10,
      progress: Math.min(100, (totalEntries / 10) * 100)
    },
    {
      id: "dedicated",
      icon: Zap,
      color: "text-violet-500",
      bgGradient: isLight 
        ? "bg-gradient-to-br from-violet-50 to-purple-100" 
        : "bg-gradient-to-br from-violet-500/20 to-purple-500/10",
      glowColor: "rgba(139, 92, 246, 0.4)",
      unlocked: stats.streak >= 14,
      current: Math.min(stats.streak, 14),
      target: 14,
      progress: Math.min(100, (stats.streak / 14) * 100)
    },
    {
      id: "monthCare",
      icon: Crown,
      color: "text-amber-600",
      bgGradient: isLight 
        ? "bg-gradient-to-br from-amber-50 to-yellow-100" 
        : "bg-gradient-to-br from-amber-500/20 to-yellow-500/10",
      glowColor: "rgba(217, 119, 6, 0.4)",
      unlocked: totalEntries >= 30,
      current: Math.min(totalEntries, 30),
      target: 30,
      progress: Math.min(100, (totalEntries / 30) * 100)
    }
  ];

  const unlockedBadges = badges.filter(b => b.unlocked);
  const lockedBadges = badges.filter(b => !b.unlocked);
  const nextBadge = lockedBadges[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${isLight ? "bg-primary/10" : "bg-primary/20"}`}>
            <Trophy className="w-4 h-4 text-primary" />
          </div>
          <h3 className={`text-base font-semibold ${isLight ? "text-gray-900" : "text-foreground"}`}>
            {language === 'ru' ? 'Достижения' : 'Achievements'}
          </h3>
        </div>
        <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
          isLight ? "bg-primary/10 text-primary" : "bg-primary/20 text-primary"
        }`}>
          {unlockedBadges.length}/{badges.length}
        </span>
      </div>
      
      {/* Unlocked badges with glow animation */}
      {unlockedBadges.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <AnimatePresence>
            {unlockedBadges.map((badge, index) => {
              const Icon = badge.icon;
              return (
                <motion.div
                  key={badge.id}
                  initial={{ scale: 0, opacity: 0, rotate: -20 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ 
                    delay: index * 0.1, 
                    type: "spring", 
                    stiffness: 300,
                    damping: 15 
                  }}
                  whileHover={{ scale: 1.08, y: -2 }}
                  className={`relative flex items-center gap-2 px-4 py-2.5 rounded-2xl border shadow-md ${
                    isLight 
                      ? `${badge.bgGradient} border-white/60`
                      : `${badge.bgGradient} border-white/10`
                  }`}
                  style={{
                    boxShadow: `0 4px 20px -2px ${badge.glowColor}`
                  }}
                >
                  {/* Sparkle effect on hover */}
                  <motion.div
                    className="absolute inset-0 rounded-2xl"
                    animate={{ 
                      boxShadow: [
                        `0 0 0 0 ${badge.glowColor}`,
                        `0 0 20px 2px transparent`
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <div className={`p-1.5 rounded-xl ${isLight ? 'bg-white/60' : 'bg-black/20'}`}>
                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${badge.color}`} />
                  </div>
                  <span className={`text-xs sm:text-sm font-semibold ${badge.color}`}>
                    {t(`diary.badges.${badge.id}`)}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Next badge progress with enhanced styling */}
      {nextBadge && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl border ${
            isLight 
              ? "bg-gradient-to-br from-white to-gray-50/50 border-gray-200/60 shadow-md" 
              : "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <motion.div 
                className={`p-2 rounded-xl ${nextBadge.bgGradient}`}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <nextBadge.icon className={`w-5 h-5 ${nextBadge.color}`} />
              </motion.div>
              <div>
                <span className={`text-sm font-semibold block ${isLight ? "text-gray-800" : "text-white"}`}>
                  {t(`diary.badges.${nextBadge.id}`)}
                </span>
                <span className={`text-xs ${isLight ? "text-gray-500" : "text-white/50"}`}>
                  {language === 'ru' ? 'Следующее достижение' : 'Next achievement'}
                </span>
              </div>
            </div>
            <span className={`text-sm font-bold ${nextBadge.color}`}>
              {nextBadge.current}/{nextBadge.target}
            </span>
          </div>
          <div className="relative">
            <Progress 
              value={nextBadge.progress} 
              className="h-2.5 rounded-full overflow-hidden"
            />
            {/* Progress glow */}
            <motion.div
              className="absolute top-0 left-0 h-2.5 rounded-full"
              style={{ 
                width: `${nextBadge.progress}%`,
                background: `linear-gradient(90deg, ${nextBadge.glowColor}, transparent)`,
                opacity: 0.5
              }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          
          {/* Encouragement message */}
          <p className={`text-xs mt-3 ${isLight ? "text-gray-500" : "text-white/50"}`}>
            {language === 'ru' 
              ? `Осталось ${nextBadge.target - nextBadge.current} — ты справишься! 💙`
              : `${nextBadge.target - nextBadge.current} more to go — you've got this! 💙`
            }
          </p>
        </motion.div>
      )}

      {/* Locked badges preview */}
      {lockedBadges.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {lockedBadges.slice(1, 4).map((badge) => {
            const Icon = badge.icon;
            return (
              <motion.div
                key={badge.id}
                whileHover={{ scale: 1.02 }}
                className={`group relative flex items-center gap-2 px-3 py-2 rounded-xl border opacity-60 hover:opacity-80 transition-all cursor-help ${
                  isLight 
                    ? "bg-gray-50/50 border-gray-200/40" 
                    : "bg-white/[0.03] border-white/5"
                }`}
              >
                <Icon className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/60"}`} />
                <span className={`text-xs font-medium ${isLight ? "text-gray-400" : "text-white/65"}`}>
                  {t(`diary.badges.${badge.id}`)}
                </span>
                <Lock className={`w-3 h-3 ${isLight ? "text-gray-300" : "text-white/20"}`} />
                
                {/* Tooltip */}
                <div className={`absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg ${
                  isLight ? "bg-gray-800 text-white" : "bg-white text-gray-900"
                }`}>
                  {badge.current}/{badge.target}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
