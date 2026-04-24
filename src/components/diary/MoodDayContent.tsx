import { DayContentProps } from "react-day-picker";
import { format } from "date-fns";
import type { MoodEntry, MoodType } from "@/hooks/useMoodEntries";

const MOOD_COLORS: Record<MoodType, string> = {
  joy: "bg-amber-400",
  calm: "bg-sky-400",
  neutral: "bg-slate-400",
  anxiety: "bg-orange-500",
  sadness: "bg-indigo-400",
  anger: "bg-red-500",
  fatigue: "bg-purple-400",
  fear: "bg-amber-500"
};

interface MoodDayContentProps extends DayContentProps {
  entries: MoodEntry[];
  crisisDates?: Set<string>;
}

export function MoodDayContent({ date, entries, crisisDates }: MoodDayContentProps) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const entry = entries.find(e => e.entry_date === dateStr);
  const hasCrisis = crisisDates?.has(dateStr);

  return (
    <div className="relative flex flex-col items-center">
      <span>{date.getDate()}</span>
      {entry && (
        <div 
          className={`absolute -bottom-1 w-1.5 h-1.5 rounded-full ${MOOD_COLORS[entry.mood]} shadow-sm`}
        />
      )}
      {hasCrisis && (
        <div
          className="absolute -top-1 -right-1 text-[9px] leading-none"
          aria-label="SOS session"
          title="SOS session"
        >
          🆘
        </div>
      )}
    </div>
  );
}

export function createMoodDayContent(entries: MoodEntry[], crisisDates?: Set<string>) {
  return function DayContent(props: DayContentProps) {
    return <MoodDayContent {...props} entries={entries} crisisDates={crisisDates} />;
  };
}
