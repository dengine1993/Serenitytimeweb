import { useMemo } from 'react';
import { BarChart3, Grid3X3, Trophy, Brain, Lock } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useI18n } from '@/hooks/useI18n';
import { usePremiumStatus } from '@/hooks/useEntitlements';
import { MoodChart } from './MoodChart';
import { MoodHeatmap } from './MoodHeatmap';
import { EnhancedMoodBadges } from './EnhancedMoodBadges';
import { BestDayCard } from './BestDayCard';

import { SMEREntryList } from './SMEREntryList';

import { DIARY_LIMITS } from '@/lib/planLimits';
import type { MoodEntry, MoodStats } from '@/hooks/useMoodEntries';
import type { SMEREntry } from '@/hooks/useSMEREntries';
import { useNavigate } from 'react-router-dom';
import { subDays, isAfter } from 'date-fns';

interface DiaryAnalyticsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: MoodEntry[];
  smerEntries: SMEREntry[];
  stats: MoodStats;
  onOpenSMERWizard: () => void;
}

/**
 * Drawer containing all diary analytics:
 * - Mood chart
 * - Heatmap
 * - Achievements/Badges
 * - Best day card
 * - SMER entries list
 */
export function DiaryAnalyticsDrawer({
  open,
  onOpenChange,
  entries,
  smerEntries,
  stats,
  onOpenSMERWizard
}: DiaryAnalyticsDrawerProps) {
  const { t, language } = useI18n();
  const { isPremium } = usePremiumStatus();
  const navigate = useNavigate();
  const isRu = language === 'ru';

  const handleUpgrade = () => {
    navigate('/premium');
    onOpenChange(false);
  };

  // Filter SMER entries for free users (14 days limit)
  const visibleSmerEntries = useMemo(() => {
    if (isPremium) return smerEntries;
    
    const cutoffDate = subDays(new Date(), DIARY_LIMITS.free.smerArchiveDays);
    return smerEntries.filter(entry => 
      isAfter(new Date(entry.entry_date || entry.created_at), cutoffDate)
    );
  }, [smerEntries, isPremium]);

  const hiddenSmerCount = smerEntries.length - visibleSmerEntries.length;

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
            <TabsList className="grid w-full grid-cols-3 bg-white/5 rounded-xl p-1">
              <TabsTrigger value="charts" className="rounded-lg text-xs gap-1">
                <BarChart3 className="w-3.5 h-3.5" />
                {isRu ? 'Графики' : 'Charts'}
              </TabsTrigger>
              <TabsTrigger value="achievements" className="rounded-lg text-xs gap-1">
                <Trophy className="w-3.5 h-3.5" />
                {isRu ? 'Достижения' : 'Achievements'}
              </TabsTrigger>
              <TabsTrigger value="smer" className="rounded-lg text-xs gap-1">
                <Brain className="w-3.5 h-3.5" />
                SMER
              </TabsTrigger>
            </TabsList>

            {/* Charts Tab */}
            <TabsContent value="charts" className="mt-4 space-y-4">
              {/* Mood Chart */}
              <Card className="p-4 bg-white/5 border-white/10 rounded-2xl">
                <h3 className="font-medium text-white mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  {isRu ? 'График настроения' : 'Mood Chart'}
                </h3>
                <MoodChart entries={entries} isLight={false} />
              </Card>

              {/* Heatmap */}
              <Card className="p-4 bg-white/5 border-white/10 rounded-2xl">
                <h3 className="font-medium text-white mb-3 flex items-center gap-2">
                  <Grid3X3 className="w-4 h-4 text-primary" />
                  {isRu ? 'Тепловая карта' : 'Heatmap'}
                </h3>
                <MoodHeatmap entries={entries} isLight={false} />
              </Card>

              {/* Best Day */}
              {entries.length > 0 && (
                <Card className="p-4 bg-white/5 border-white/10 rounded-2xl">
                  <BestDayCard entries={entries} isLight={false} />
                </Card>
              )}
            </TabsContent>

            {/* Achievements Tab */}
            <TabsContent value="achievements" className="mt-4 space-y-4">
              <Card className="p-4 bg-white/5 border-white/10 rounded-2xl">
                <EnhancedMoodBadges stats={stats} totalEntries={entries.length} isLight={false} />
              </Card>
            </TabsContent>

            {/* SMER Tab */}
            <TabsContent value="smer" className="mt-4 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-white">
                  {isRu ? 'Записи СМЭР' : 'SMER Entries'}
                </h3>
                <div className="flex gap-2">
                  <Button size="sm" onClick={onOpenSMERWizard} className="bg-primary hover:bg-primary/90">
                    + {isRu ? 'Новая' : 'New'}
                  </Button>
                </div>
              </div>
              {visibleSmerEntries.length === 0 ? (
                <Card className="p-6 bg-white/5 border-white/10 rounded-2xl text-center">
                  <Brain className="w-10 h-10 text-white/20 mx-auto mb-3" />
                  <p className="text-sm text-white/60 mb-4">
                    {isRu 
                      ? 'СМЭР записи появятся после сохранения тревожного настроения' 
                      : 'SMER entries will appear after saving an anxious mood'}
                  </p>
                  <Button variant="outline" size="sm" onClick={onOpenSMERWizard} className="border-white/20 text-white hover:bg-white/10">
                    {isRu ? 'Создать запись' : 'Create entry'}
                  </Button>
                </Card>
              ) : (
                <>
                  <SMEREntryList entries={visibleSmerEntries} isLight={false} />
                  
                  {/* Archive paywall for free users */}
                  {!isPremium && hiddenSmerCount > 0 && (
                    <Card className="p-4 bg-gradient-to-br from-primary/10 to-transparent border-primary/20 text-center">
                      <Lock className="w-6 h-6 text-primary/60 mx-auto mb-2" />
                      <p className="text-sm text-white/80 mb-2">
                        {isRu 
                          ? `+${hiddenSmerCount} записей в архиве` 
                          : `+${hiddenSmerCount} entries in archive`}
                      </p>
                      <p className="text-xs text-white/50 mb-3">
                        {isRu 
                          ? 'Полный архив СМЭР доступен с подпиской Опора' 
                          : 'Full SMER archive available with Anchor subscription'}
                      </p>
                      <Button size="sm" onClick={handleUpgrade} variant="outline" className="border-primary/30 text-primary hover:bg-primary/10">
                        {isRu ? 'Открыть архив' : 'Unlock archive'}
                      </Button>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
