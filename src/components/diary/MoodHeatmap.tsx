import { useMemo, useState } from "react";
import { format, subDays, startOfYear, eachDayOfInterval, getDay } from "date-fns";
import { ru, enUS } from "date-fns/locale";
import { Maximize2, Minimize2 } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { MoodEntry, MoodType } from "@/hooks/useMoodEntries";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MoodHeatmapProps {
  entries: MoodEntry[];
  isLight: boolean;
}

const MOOD_BG_CLASSES: Record<MoodType, string> = {
  joy: "bg-green-500",
  calm: "bg-blue-400",
  neutral: "bg-slate-400",
  anxiety: "bg-orange-500",
  sadness: "bg-indigo-400",
  anger: "bg-red-500",
  fatigue: "bg-purple-400",
  fear: "bg-amber-500"
};

type DayData = {
  date: Date;
  dateStr: string;
  dayOfWeek: number;
  entry: MoodEntry | undefined;
};

type Week = DayData[];
type MonthGroup = { month: string; weeks: Week[] };

export function MoodHeatmap({ entries, isLight }: MoodHeatmapProps) {
  const { t, language } = useI18n();
  const locale = language === 'ru' ? ru : enUS;
  const [expanded, setExpanded] = useState(false);

  const squareSize = expanded ? 10 : 16;
  const gap = expanded ? 2 : 3;

  const heatmapData = useMemo(() => {
    const today = new Date();
    const start = expanded ? startOfYear(today) : subDays(today, 90);
    const days = eachDayOfInterval({ start, end: today });

    const entriesMap = new Map<string, MoodEntry>();
    entries.forEach(e => entriesMap.set(e.entry_date, e));

    return days.map(day => ({
      date: day,
      dateStr: format(day, 'yyyy-MM-dd'),
      dayOfWeek: getDay(day),
      entry: entriesMap.get(format(day, 'yyyy-MM-dd'))
    }));
  }, [entries, expanded]);

  const weeks = useMemo(() => {
    const result: Week[] = [];
    let currentWeek: Week = [];

    heatmapData.forEach((day, index) => {
      if (index === 0) {
        for (let i = 0; i < day.dayOfWeek; i++) {
          currentWeek.push({ date: new Date(), dateStr: '', dayOfWeek: i, entry: undefined });
        }
      }
      currentWeek.push(day);
      if (day.dayOfWeek === 6 || index === heatmapData.length - 1) {
        result.push(currentWeek);
        currentWeek = [];
      }
    });
    return result;
  }, [heatmapData]);

  const monthGroups = useMemo(() => {
    const groups: MonthGroup[] = [];
    let currentMonth = -1;

    weeks.forEach(week => {
      const firstValidDay = week.find(d => d.dateStr);
      if (!firstValidDay) return;

      const month = firstValidDay.date.getMonth();
      if (month !== currentMonth) {
        const monthName = format(firstValidDay.date, expanded ? 'MMM' : 'LLLL', { locale });
        groups.push({
          month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
          weeks: [week]
        });
        currentMonth = month;
      } else {
        groups[groups.length - 1].weeks.push(week);
      }
    });

    return groups;
  }, [weeks, expanded, locale]);

  const cellPx = `${squareSize}px`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className={`text-sm font-medium ${isLight ? "text-gray-600" : "text-muted-foreground"}`}>
          {t('diary.heatmap.title')}
        </h3>
        <button
          onClick={() => setExpanded(!expanded)}
          className={`p-1.5 rounded-lg transition-colors ${
            isLight ? "hover:bg-gray-100 text-gray-500" : "hover:bg-white/10 text-muted-foreground"
          }`}
          title={expanded ? (language === 'ru' ? '3 месяца' : '3 months') : (language === 'ru' ? 'Весь год' : 'Full year')}
        >
          {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      </div>

      <div className="overflow-x-auto pb-2 -mx-2 px-2">
        <div style={{ minWidth: expanded ? '600px' : undefined }}>
          <div className="flex items-end" style={{ gap: '8px' }}>
            {/* Day labels column */}
            <div className="flex flex-col shrink-0" style={{ gap: `${gap}px`, paddingTop: '20px' }}>
              {[
                t('diary.weekDays.mon'),
                t('diary.weekDays.tue'),
                t('diary.weekDays.wed'),
                t('diary.weekDays.thu'),
                t('diary.weekDays.fri'),
                t('diary.weekDays.sat'),
                t('diary.weekDays.sun')
              ].map((day, i) => (
                <div
                  key={i}
                  className={`text-[9px] flex items-center pr-1 ${isLight ? "text-gray-400" : "text-muted-foreground/60"}`}
                  style={{ height: cellPx }}
                >
                  {i % 2 === 0 ? day : ''}
                </div>
              ))}
            </div>

            {/* Month groups */}
            <TooltipProvider delayDuration={100}>
              {monthGroups.map((group, gi) => (
                <div key={gi} className="flex flex-col">
                  {/* Month label */}
                  <div
                    className={`text-[11px] text-center mb-1 font-medium ${
                      isLight ? "text-gray-500" : "text-muted-foreground"
                    }`}
                  >
                    {group.month}
                  </div>

                  {/* Weeks in this month */}
                  <div className="flex" style={{ gap: `${gap}px` }}>
                    {group.weeks.map((week, weekIndex) => (
                      <div key={weekIndex} className="flex flex-col" style={{ gap: `${gap}px` }}>
                        {[0, 1, 2, 3, 4, 5, 6].map(dayIndex => {
                          const day = week.find(d => d.dayOfWeek === dayIndex);
                          if (!day || !day.dateStr) {
                            return <div key={dayIndex} style={{ width: cellPx, height: cellPx }} />;
                          }

                          return (
                            <Tooltip key={dayIndex}>
                              <TooltipTrigger asChild>
                                <div
                                  className={`rounded-[3px] transition-all cursor-pointer hover:scale-125 hover:z-10 ${
                                    day.entry
                                      ? MOOD_BG_CLASSES[day.entry.mood]
                                      : isLight ? "bg-gray-200/60" : "bg-accent/30"
                                  }`}
                                  style={{ width: cellPx, height: cellPx }}
                                />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                <p className="font-medium">
                                  {format(day.date, 'd MMM yyyy', { locale })}
                                </p>
                                {day.entry && (
                                  <p className="text-muted-foreground">
                                    {t(`diary.moods.${day.entry.mood}`)}
                                  </p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap mt-3">
        <span className={`text-xs font-medium ${isLight ? "text-gray-500" : "text-muted-foreground"}`}>
          {t('diary.heatmap.legend')}:
        </span>
        {Object.entries(MOOD_BG_CLASSES).map(([mood, bgClass]) => (
          <div key={mood} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-sm ${bgClass}`} />
            <span className={`text-[10px] sm:text-xs ${isLight ? "text-gray-600" : "text-muted-foreground"}`}>
              {t(`diary.moods.${mood}`)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
