import { useEffect, useState } from 'react';
import { Heart, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';

interface MoodStats {
  averageIntensity: number;
  trend: 'up' | 'down' | 'stable';
  totalEntries: number;
  mostCommonEmotion: string;
}

export function MoodStatsWidget() {
  const { user } = useAuth();
  const [stats, setStats] = useState<MoodStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadMoodStats = async () => {
      try {
        // Get last 30 days of emotion data
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: emotions } = await supabase
          .from('emotion_calendar')
          .select('emotion, intensity, entry_date')
          .eq('user_id', user.id)
          .gte('entry_date', thirtyDaysAgo.toISOString().split('T')[0])
          .order('entry_date', { ascending: false });

        if (!emotions || emotions.length === 0) {
          setLoading(false);
          return;
        }

        // Calculate average intensity
        const avgIntensity = emotions.reduce((sum, e) => sum + e.intensity, 0) / emotions.length;

        // Calculate trend (last 7 days vs previous 7 days)
        const last7 = emotions.slice(0, 7);
        const prev7 = emotions.slice(7, 14);

        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (last7.length > 0 && prev7.length > 0) {
          const last7Avg = last7.reduce((sum, e) => sum + e.intensity, 0) / last7.length;
          const prev7Avg = prev7.reduce((sum, e) => sum + e.intensity, 0) / prev7.length;
          
          if (last7Avg > prev7Avg + 0.5) trend = 'up';
          else if (last7Avg < prev7Avg - 0.5) trend = 'down';
        }

        // Find most common emotion
        const emotionCounts = emotions.reduce((acc, e) => {
          acc[e.emotion] = (acc[e.emotion] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const mostCommon = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0][0];

        setStats({
          averageIntensity: Math.round(avgIntensity * 10) / 10,
          trend,
          totalEntries: emotions.length,
          mostCommonEmotion: mostCommon
        });
      } catch (error) {
        console.error('Error loading mood stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMoodStats();
  }, [user]);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-rose/10 to-rose/5 backdrop-blur-lg border-2 border-rose/30 rounded-2xl p-3 animate-pulse">
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 rounded-lg bg-rose/15">
            <Heart className="h-4 w-4 text-rose opacity-50" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-rose/10 rounded w-20" />
            <div className="h-2 bg-rose/10 rounded w-28" />
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    // Empty state - encourage starting diary
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-rose/10 to-rose/5 backdrop-blur-lg border-2 border-rose/30 rounded-2xl p-3 cursor-pointer hover:border-rose/50 transition-all duration-300 group"
        onClick={() => window.location.href = '/diary'}
      >
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 rounded-lg bg-rose/15 group-hover:bg-rose/25 transition-colors">
            <Heart className="h-4 w-4 text-rose" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-medium text-foreground mb-1">
              Настроение
            </h4>
            <p className="text-xs text-muted-foreground/90 mb-1.5 line-clamp-2 leading-relaxed">
              Начни отслеживать эмоции в дневнике
            </p>
            <span className="text-xs text-rose group-hover:text-rose/80 transition-colors">
              Открыть дневник →
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  const TrendIcon = stats.trend === 'up' ? TrendingUp : stats.trend === 'down' ? TrendingDown : Minus;
  const trendColor = stats.trend === 'up' ? 'text-green-500' : stats.trend === 'down' ? 'text-orange-500' : 'text-muted-foreground';

  const emotionEmoji: Record<string, string> = {
    'joy': '😊',
    'calm': '😌',
    'anxiety': '😰',
    'sadness': '😔',
    'anger': '😤',
    'neutral': '😐'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-gradient-to-br from-rose/10 to-rose/5 backdrop-blur-lg border-2 border-rose/30 rounded-2xl p-3 hover:border-rose/50 transition-all duration-300"
    >
      <div className="flex items-start gap-2.5">
        <div className="p-1.5 rounded-lg bg-rose/15">
          <Heart className="h-4 w-4 text-rose" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-medium text-muted-foreground/90 mb-2">
            Настроение
          </h4>
          
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground/90">Средний уровень</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-foreground">
                  {stats.averageIntensity}/10
                </span>
                <TrendIcon className={`w-3 h-3 ${trendColor}`} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground/90">Чаще всего</span>
              <span className="text-xl">
                {emotionEmoji[stats.mostCommonEmotion] || '💭'}
              </span>
            </div>

            <div className="pt-1 border-t border-border/20">
              <span className="text-xs text-muted-foreground/90">
                {stats.totalEntries} записей за месяц
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
