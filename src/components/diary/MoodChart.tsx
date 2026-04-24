import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { format, subDays, parseISO } from "date-fns";
import { ru, enUS } from "date-fns/locale";
import { useI18n } from "@/hooks/useI18n";
import type { MoodEntry, MoodType } from "@/hooks/useMoodEntries";

interface MoodChartProps {
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

const MOOD_COLORS: Record<MoodType, string> = {
  joy: "#22c55e",
  calm: "#60a5fa",
  neutral: "#94a3b8",
  anxiety: "#f97316",
  sadness: "#818cf8",
  anger: "#ef4444",
  fatigue: "#a855f7",
  fear: "#f59e0b"
};

export function MoodChart({ entries, isLight }: MoodChartProps) {
  const { t, language } = useI18n();
  const locale = language === 'ru' ? ru : enUS;

  const chartData = useMemo(() => {
    const last30Days: { date: string; score: number | null; mood: MoodType | null; label: string }[] = [];
    const today = new Date();

    for (let i = 29; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const entry = entries.find(e => e.entry_date === dateStr);
      
      last30Days.push({
        date: dateStr,
        score: entry ? MOOD_SCORES[entry.mood] : null,
        mood: entry?.mood || null,
        label: format(date, 'd', { locale })
      });
    }

    return last30Days;
  }, [entries, locale]);

  // Filter only days with entries for the chart
  const filledData = chartData.filter(d => d.score !== null);

  if (filledData.length < 2) {
    return (
      <div className={`text-center py-8 text-sm ${isLight ? "text-gray-500" : "text-muted-foreground"}`}>
        {t('diary.chart.notEnoughData')}
      </div>
    );
  }

  return (
    <div className="h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={filledData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="label" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: isLight ? '#6b7280' : '#9ca3af' }}
            interval="preserveStartEnd"
          />
          <YAxis 
            domain={[1, 5]}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: isLight ? '#6b7280' : '#9ca3af' }}
            tickFormatter={(value) => {
              const labels: Record<number, string> = { 1: '😠', 2: '😰', 3: '😴', 4: '😌', 5: '😊' };
              return labels[value] || '';
            }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className={`px-3 py-2 rounded-lg shadow-lg text-sm ${
                    isLight ? "bg-white border border-gray-200" : "bg-card border border-border"
                  }`}>
                    <p className={isLight ? "text-gray-900" : "text-foreground"}>
                      {data.mood && t(`diary.moods.${data.mood}`)}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#moodGradient)"
            dot={(props) => {
              const { cx, cy, payload } = props;
              if (!payload.mood) return null;
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill={MOOD_COLORS[payload.mood as MoodType]}
                  stroke={isLight ? "#fff" : "#1f2937"}
                  strokeWidth={2}
                />
              );
            }}
            activeDot={{ r: 6, stroke: "hsl(var(--primary))", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export { MOOD_COLORS };
