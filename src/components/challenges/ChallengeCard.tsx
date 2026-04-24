import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Calendar, Users, Trophy, Target, Flame } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { pluralize } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";

interface ChallengeCardProps {
  challenge: {
    id: string;
    title: string;
    description: string;
    duration_days: number;
    difficulty: string;
    category: string;
    icon?: string;
    participants_count: number;
    reward_points?: number;
  };
  userProgress?: {
    progress: number;
    started_at: string;
    completed_at: string | null;
    current_streak?: number;
  } | null;
  onJoin: () => void;
  onViewDetails?: () => void;
  isJoining?: boolean;
}

const DIFFICULTY_CONFIG: Record<string, { label: string; color: string }> = {
  easy: {
    label: "Лёгкий",
    color: "bg-green-400/20 border-green-300/30 text-green-100"
  },
  medium: {
    label: "Средний",
    color: "bg-yellow-400/20 border-yellow-300/30 text-yellow-100"
  },
  hard: {
    label: "Сложный",
    color: "bg-red-400/20 border-red-300/30 text-red-100"
  }
};

const CATEGORY_COLORS: Record<string, string> = {
  "Дневник": "bg-purple-400/20 border-purple-300/30 text-purple-100",
  "Осознанность": "bg-blue-400/20 border-blue-300/30 text-blue-100",
  "Общение": "bg-pink-400/20 border-pink-300/30 text-pink-100",
  "Упражнения": "bg-cyan-400/20 border-cyan-300/30 text-cyan-100"
};

export const ChallengeCard = ({
  challenge,
  userProgress,
  onJoin,
  onViewDetails,
  isJoining
}: ChallengeCardProps) => {
  const { getPlural } = useI18n();
  const difficultyConfig = DIFFICULTY_CONFIG[challenge.difficulty] || DIFFICULTY_CONFIG.medium;
  const isParticipating = !!userProgress;
  const isCompleted = userProgress?.completed_at !== null;

  return (
    <Card className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 hover:bg-white/10 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge className={difficultyConfig.color}>
              {difficultyConfig.label}
            </Badge>
            {challenge.category && (
              <Badge className={CATEGORY_COLORS[challenge.category] || "bg-white/5 border-white/10"}>
                {challenge.category}
              </Badge>
            )}
          </div>
          <h3 className="text-white font-semibold text-xl mb-2">
            {challenge.title}
          </h3>
          <p className="text-blue-100/70 text-sm">
            {challenge.description}
          </p>
        </div>
        
        {isCompleted && (
          <Trophy className="w-8 h-8 text-yellow-300 shrink-0" />
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4 text-sm text-blue-100/70">
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          {challenge.duration_days} {pluralize(challenge.duration_days, getPlural('day'))}
        </div>
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          {challenge.participants_count}
        </div>
        {challenge.reward_points && (
          <div className="flex items-center gap-1">
            <Target className="w-4 h-4" />
            +{challenge.reward_points} XP
          </div>
        )}
      </div>

      {/* Progress Section */}
      {isParticipating && userProgress && (
        <div className="mb-4 p-4 rounded-lg bg-white/5 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white text-sm font-medium">
              Твой прогресс
            </span>
            <span className="text-blue-100/70 text-sm">
              {userProgress.progress}%
            </span>
          </div>
          <Progress value={userProgress.progress} className="h-2 mb-3" />
          
          <div className="flex items-center gap-4 text-xs text-blue-100/70">
            {userProgress.current_streak && userProgress.current_streak > 0 && (
              <div className="flex items-center gap-1">
                <Flame className="w-3 h-3 text-orange-300" />
                Серия: {userProgress.current_streak} {pluralize(userProgress.current_streak, getPlural('day'))}
              </div>
            )}
            <div>
              Начато: {format(new Date(userProgress.started_at), 'dd MMM', { locale: ru })}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {!isParticipating && (
          <Button
            onClick={onJoin}
            disabled={isJoining}
            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:scale-105 transition-transform"
          >
            {isJoining ? 'Присоединение...' : 'Начать челлендж'}
          </Button>
        )}
        
        {isParticipating && !isCompleted && (
          <Button
            onClick={onViewDetails}
            className="flex-1 bg-white/10 hover:bg-white/20"
          >
            Продолжить
          </Button>
        )}
        
        {isCompleted && (
          <Button
            disabled
            className="flex-1 bg-green-400/20 text-green-100"
          >
            ✓ Завершён
          </Button>
        )}
      </div>
    </Card>
  );
};
