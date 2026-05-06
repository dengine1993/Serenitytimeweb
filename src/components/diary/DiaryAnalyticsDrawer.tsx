import { BarChart3, Grid3X3, Trophy } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { useI18n } from '@/hooks/useI18n';
import { MoodChart } from './MoodChart';
import { MoodHeatmap } from './MoodHeatmap';
import { EnhancedMoodBadges } from './EnhancedMoodBadges';
import { BestDayCard } from './BestDayCard';
import type { MoodEntry, MoodStats } from '@/hooks/useMoodEntries';

interface DiaryAnalyticsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: MoodEntry[];
  stats: MoodStats;
}

export function DiaryAnalyticsDrawer({
  open,
  onOpenChange,
  entries,
  stats,
}: DiaryAnalyticsDrawerProps) {
  const { language } = useI18n();
  const isRu = language === 'ru';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg bg-[#0A0C14] border-l border-white/10 overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-white/10">
          <SheetTitle className="text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            {isRu ? 'Аналитика дневника' : 'Diary Analytics'}
          </SheetTitle>
        </SheetHeader>

        <div className="py-6 space-y-6">
          <Tabs defaultValue="charts" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white/5 rounded-xl p-1">
              <TabsTrigger value="charts" className="rounded-lg text-xs gap-1">
                <BarChart3 className="w-3.5 h-3.5" />
                {isRu ? 'Графики' : 'Charts'}
              </TabsTrigger>
              <TabsTrigger value="achievements" className="rounded-lg text-xs gap-1">
                <Trophy className="w-3.5 h-3.5" />
                {isRu ? 'Достижения' : 'Achievements'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="charts" className="mt-4 space-y-4">
              <Card className="p-4 bg-white/5 border-white/10 rounded-2xl">
                <h3 className="font-medium text-white mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  {isRu ? 'График настроения' : 'Mood Chart'}
                </h3>
                <MoodChart entries={entries} isLight={false} />
              </Card>

              <Card className="p-4 bg-white/5 border-white/10 rounded-2xl">
                <h3 className="font-medium text-white mb-3 flex items-center gap-2">
                  <Grid3X3 className="w-4 h-4 text-primary" />
                  {isRu ? 'Тепловая карта' : 'Heatmap'}
                </h3>
                <MoodHeatmap entries={entries} isLight={false} />
              </Card>

              {entries.length > 0 && (
                <Card className="p-4 bg-white/5 border-white/10 rounded-2xl">
                  <BestDayCard entries={entries} isLight={false} />
                </Card>
              )}
            </TabsContent>

            <TabsContent value="achievements" className="mt-4 space-y-4">
              <Card className="p-4 bg-white/5 border-white/10 rounded-2xl">
                <EnhancedMoodBadges stats={stats} totalEntries={entries.length} isLight={false} />
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
