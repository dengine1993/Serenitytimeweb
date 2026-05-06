import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { usePremiumStatus } from "@/hooks/useEntitlements";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

import SEO from "@/components/SEO";
import { HomeHeader } from "@/components/home/HomeHeader";
import { HomeFeed } from "@/components/home/HomeFeed";
import { JivaHeroCard } from "@/components/home/JivaHeroCard";
import { EnhancedStreakWidget } from "@/components/home/EnhancedStreakWidget";
import { QuickMoodEntry } from "@/components/diary/QuickMoodEntry";
import { StoriesStrip } from "@/components/home/StoriesStrip";
import { useMoodEntries } from "@/hooks/useMoodEntries";


import { HomeSkeleton } from "@/components/home/HomeSkeleton";


import { AppTour } from "@/components/onboarding/AppTour";

import { HomeParticles } from "@/components/home/HomeParticles";
import { PremiumCTACard } from "@/components/home/PremiumCTACard";
import { PremiumStatusBanner } from "@/components/home/PremiumStatusBanner";
import { HomeThemeContext } from "@/hooks/useHomeTheme";
import { cn } from "@/lib/utils";
import { shouldResetLimits } from "@/lib/dateUtils";

export default function Home() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { isPremium } = usePremiumStatus();
  const { stats } = useMoodEntries();
  const hasStreak = stats.streak > 0;
  
  // Fixed dark theme - toggle removed from UI
  const theme = 'dark' as const;
  const toggleTheme = () => {};

  const [showTour, setShowTour] = useState(false);
  const resetCheckRef = useRef(false);

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['home-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("display_name, username, avatar_url, timezone, last_daily_reset")
        .eq("user_id", user.id)
        .single();
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    placeholderData: { display_name: null, username: null, avatar_url: null, timezone: null, last_daily_reset: null },
  });

  const rawName = profileData?.display_name || profileData?.username || "";
  // Фолбек: короткие имена (1-2 символа) выглядят странно в приветствии — заменяем на «Друг»
  const userName = rawName.trim().length >= 3 ? rawName : "Друг";
  const avatarUrl = profileData?.avatar_url || undefined;

  useEffect(() => {
    const localFlag = localStorage.getItem('app_tour_completed');
    const metaFlag = (user?.user_metadata as any)?.app_tour_completed;
    if (metaFlag && !localFlag) {
      // Mirror to localStorage so subsequent renders don't even need to read metadata
      localStorage.setItem('app_tour_completed', 'true');
    }
    if (!localFlag && !metaFlag) {
      setShowTour(true);
    }
  }, [user]);

  // Check for daily limit reset at 7:00 AM local time
  useEffect(() => {
    if (!user || !profileData || resetCheckRef.current) return;
    
    const timezone = profileData.timezone || 'Europe/Moscow';
    const lastReset = profileData.last_daily_reset;
    
    // Check if reset is needed
    if (shouldResetLimits(lastReset, timezone)) {
      resetCheckRef.current = true;
      
      // Call reset-daily-limits edge function
      supabase.functions.invoke('reset-daily-limits')
        .then(({ data, error }) => {
          if (error) {
            console.error('[Home] Daily reset error:', error);
          } else if (data?.reset) {
            console.log('[Home] Daily limits reset:', data);
          }
        })
        .catch(err => {
          console.error('[Home] Daily reset call failed:', err);
        });
    }
  }, [user, profileData]);

  // Only show skeleton on first load when user exists but profile not yet cached
  if (user && isLoading && !profileData) {
    return (
      <>
        <SEO />
        <HomeSkeleton />
      </>
    );
  }

  return (
    <HomeThemeContext.Provider value={{ theme, toggleTheme }}>
      <SEO />
      
      

      
      <HomeParticles />

      <div className="min-h-screen pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-8 relative transition-colors duration-500 bg-sunrise-ambient">
        <div className="max-w-7xl mx-auto relative z-10">
          <HomeHeader 
            userName={userName}
            isPremium={isPremium}
            avatarUrl={avatarUrl}
          />

          {/* Jiva Hero — герой главной */}
          <div className="px-4 sm:px-6 mb-3 sm:mb-4">
            <JivaHeroCard isPremium={isPremium} />
          </div>

          {/* Stories — горизонтальная лента, прямой доступ к чужим и своей истории */}
          <StoriesStrip />

          <div className="px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">

              {/* Quick Mood — первый блок на мобиле, в сайдбаре на desktop */}
              <div className="lg:col-span-4 lg:order-2 lg:hidden">
                <QuickMoodEntry compact />
              </div>

              {/* Main Content - Feed (Little Sunrises) */}
              <div
                className="lg:col-span-8 lg:order-1"
                role="main"
                aria-label="Лента сообщений"
              >
                <HomeFeed />
              </div>

              {/* Sidebar (desktop) / нижние блоки (mobile) */}
              <aside
                className="lg:col-span-4 lg:order-2 lg:sticky lg:top-4 space-y-3 relative"
                aria-label="Инструменты"
              >
                {/* Quick Mood — desktop only тут */}
                <div className="hidden lg:block">
                  <QuickMoodEntry compact />
                </div>

                {/* Streak Widget — показываем только если есть стрик */}
                {hasStreak && <EnhancedStreakWidget />}

                {/* Premium Status/CTA Card */}
                {isPremium ? <PremiumStatusBanner /> : <PremiumCTACard />}
              </aside>
            </div>
          </div>
        </div>
      </div>

      {showTour && (
        <AppTour onComplete={() => setShowTour(false)} />
      )}
    </HomeThemeContext.Provider>
  );
}