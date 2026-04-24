import { useState, useEffect, Suspense, lazy } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Settings as SettingsIcon, User, Bell, Lock, Palette, CreditCard, ChevronRight, ArrowLeft, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import SEO from "@/components/SEO";
import { SettingsSkeleton, TabContentSkeleton } from "@/components/profile/SettingsSkeleton";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { usePremiumStatus } from "@/hooks/useEntitlements";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

// Lazy load heavy components
const ProfileEditForm = lazy(() => import("@/components/profile/ProfileEditForm").then(m => ({ default: m.ProfileEditForm })));
const SecuritySection = lazy(() => import("@/components/profile/SecuritySection").then(m => ({ default: m.SecuritySection })));
const NotificationsSettings = lazy(() => import("@/components/profile/NotificationsSettings").then(m => ({ default: m.NotificationsSettings })));
const PrivacySettings = lazy(() => import("@/components/profile/PrivacySettings").then(m => ({ default: m.PrivacySettings })));
const ArtGalleryTab = lazy(() => import("@/components/profile/ArtGalleryTab").then(m => ({ default: m.ArtGalleryTab })));
const FriendsList = lazy(() => import("@/components/friends/FriendsList").then(m => ({ default: m.FriendsList })));

type SettingsTab = "profile" | "subscription" | "notifications" | "privacy" | "friends" | "gallery";

export default function Settings() {
  const { language } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const { isPremium } = usePremiumStatus();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const tabParam = searchParams.get("tab") as SettingsTab | null;
  const [activeTab, setActiveTab] = useState<SettingsTab>(tabParam || "profile");

  const isRu = language === 'ru';

  useEffect(() => {
    if (tabParam && ["profile", "subscription", "notifications", "privacy", "friends", "gallery"].includes(tabParam)) {
      setActiveTab(tabParam as SettingsTab);
    }
  }, [tabParam]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as SettingsTab);
    setSearchParams({ tab });
  };

  const settingsItems = [
    { id: "profile" as const, icon: User, title: isRu ? "Профиль" : "Profile", shortTitle: isRu ? "Профиль" : "Profile", color: "text-blue-400" },
    { id: "subscription" as const, icon: CreditCard, title: isRu ? "Подписка" : "Subscription", shortTitle: isRu ? "План" : "Plan", color: "text-amber-400" },
    { id: "friends" as const, icon: Users, title: isRu ? "Друзья" : "Friends", shortTitle: isRu ? "Друзья" : "Friends", color: "text-green-400" },
    { id: "notifications" as const, icon: Bell, title: isRu ? "Уведомления" : "Notifications", shortTitle: isRu ? "Увед." : "Alerts", color: "text-orange-400" },
    { id: "privacy" as const, icon: Lock, title: isRu ? "Приватность" : "Privacy", shortTitle: isRu ? "Прив." : "Privacy", color: "text-rose-400" },
    { id: "gallery" as const, icon: Palette, title: isRu ? "Галерея" : "Gallery", shortTitle: isRu ? "Галерея" : "Gallery", color: "text-teal-400" }
  ];

  return (
    <>
      <SEO 
        title={isRu ? 'Настройки' : 'Settings'}
        description={isRu ? 'Управляй своим профилем и настройками' : 'Manage your profile and settings'}
      />

      <div className="min-h-screen bg-background relative overflow-hidden">
        <div className="container max-w-2xl mx-auto px-4 py-6 pb-32">
          {/* Compact Header */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/app')}
              className="w-10 h-10 rounded-xl bg-muted/50 hover:bg-muted text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {isRu ? 'Настройки' : 'Settings'}
            </h1>
          </motion.div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            {/* Improved Tab List - always shows short labels on mobile */}
            <TabsList className="w-full flex justify-between mb-6 bg-muted/50 border border-border rounded-2xl p-1.5 h-auto">
              {settingsItems.map((item) => (
                <TabsTrigger
                  key={item.id}
                  value={item.id}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl text-[10px] sm:text-xs font-medium",
                    "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
                    "text-muted-foreground hover:text-foreground transition-all duration-200"
                  )}
                >
                  <item.icon className={cn(
                    "w-5 h-5 sm:w-4 sm:h-4 transition-colors",
                    activeTab === item.id ? item.color : ""
                  )} />
                  {/* Always show labels - short on mobile, full on desktop */}
                  <span className="sm:hidden truncate max-w-full">{item.shortTitle}</span>
                  <span className="hidden sm:block">{item.title}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Suspense fallback={<SettingsSkeleton />}>
                <ProfileEditForm />
                <Separator className="bg-border" />
                <SecuritySection />
              </Suspense>
            </TabsContent>

            {/* Subscription Tab */}
            <TabsContent value="subscription" className="space-y-4">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="glass-card p-6 border-primary/30">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-1">
                        {isPremium ? (isRu ? "Premium активен" : "Premium active") : (isRu ? "Текущий план: Бесплатный" : "Current plan: Free")}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {isPremium ? (isRu ? "У вас полный доступ" : "Full access") : (isRu ? "Разблокируйте все функции" : "Unlock all features")}
                      </p>
                      {!isPremium && (
                        <Button onClick={() => navigate('/premium')} className="bg-gradient-to-r from-amber-500 to-orange-500">
                          {isRu ? "Получить Premium" : "Get Premium"} <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="friends">
              <Suspense fallback={<TabContentSkeleton variant="simple" />}>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <FriendsList />
                </motion.div>
              </Suspense>
            </TabsContent>
            <TabsContent value="notifications">
              <Suspense fallback={<TabContentSkeleton variant="simple" />}>
                <NotificationsSettings />
              </Suspense>
            </TabsContent>
            <TabsContent value="privacy">
              <Suspense fallback={<TabContentSkeleton variant="simple" />}>
                <PrivacySettings />
              </Suspense>
            </TabsContent>
            <TabsContent value="gallery">
              <Suspense fallback={<TabContentSkeleton variant="simple" />}>
                <ArtGalleryTab />
              </Suspense>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
