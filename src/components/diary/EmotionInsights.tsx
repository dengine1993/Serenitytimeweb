import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertTriangle, Sparkles } from "lucide-react";

interface EmotionInsightsProps {
  insights: {
    mostCommonEmotion?: string;
    averageMoodScore: number;
    moodTrend?: 'up' | 'down' | 'stable';
    topTriggers: Array<{ trigger: string; count: number }>;
    recommendation?: string;
  };
}

const EMOTION_LABELS: Record<string, string> = {
  joy: "Радость",
  calm: "Спокойствие",
  neutral: "Ровное состояние",
  sadness: "Грусть",
  anger: "Злость",
  fatigue: "Усталость",
  fear: "Страх",
  hope: "Надежда",
  gratitude: "Благодарность",
  pride: "Гордость",
};

export const EmotionInsights = ({ insights }: EmotionInsightsProps) => {
  const getTrendIcon = () => {
    switch (insights.moodTrend) {
      case 'up':
        return <TrendingUp className="w-5 h-5 text-green-300" />;
      case 'down':
        return <TrendingDown className="w-5 h-5 text-amber-300" />;
      default:
        return <Sparkles className="w-5 h-5 text-blue-300" />;
    }
  };

  const getTrendText = () => {
    switch (insights.moodTrend) {
      case 'up':
        return "Настроение растёт";
      case 'down':
        return "Настроение снижается";
      default:
        return "Настроение стабильно";
    }
  };

  const getTrendColor = () => {
    switch (insights.moodTrend) {
      case 'up':
        return "border-green-400/30 bg-green-400/10";
      case 'down':
        return "border-amber-400/30 bg-amber-400/10";
      default:
        return "border-blue-400/30 bg-blue-400/10";
    }
  };

  return (
    <Card className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-6 h-6 text-purple-300" />
        <h3 className="text-white font-semibold text-lg">Твои инсайты</h3>
      </div>

      <div className="space-y-4">
        <div className={`p-4 rounded-lg border ${getTrendColor()}`}>
          <div className="flex items-center gap-2 mb-2">
            {getTrendIcon()}
            <span className="text-white font-medium">{getTrendText()}</span>
          </div>
          <p className="text-sm text-blue-100/70">
            Средний балл: {insights.averageMoodScore.toFixed(1)}/10
          </p>
        </div>

        {insights.mostCommonEmotion && (
          <div className="p-4 rounded-lg border border-white/10 bg-white/5">
            <p className="text-sm text-blue-100/70 mb-1">Чаще всего чувствуешь</p>
            <p className="text-white font-semibold">
              {EMOTION_LABELS[insights.mostCommonEmotion] || insights.mostCommonEmotion}
            </p>
          </div>
        )}

        {insights.topTriggers.length > 0 && (
          <div className="p-4 rounded-lg border border-orange-400/30 bg-orange-400/10">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-orange-300" />
              <span className="text-white font-medium">Что чаще всего влияет</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {insights.topTriggers.slice(0, 3).map((trigger) => (
                <Badge
                  key={trigger.trigger}
                  className="bg-orange-400/20 border-orange-300/30 text-orange-100"
                >
                  {trigger.trigger} ({trigger.count})
                </Badge>
              ))}
            </div>
          </div>
        )}

        {insights.recommendation && (
          <div className="p-4 rounded-lg border border-green-400/30 bg-green-400/10">
            <p className="text-sm text-green-100">
              💡 {insights.recommendation}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};
