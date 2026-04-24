import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Bell, 
  Moon, 
  Volume2, 
  VolumeX, 
  Smartphone, 
  UserPlus, 
  MessageCircle, 
  AtSign, 
  Heart,
  MessageSquare,
  Settings2
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useI18n } from "@/hooks/useI18n";
import { useWebPush } from "@/hooks/useWebPush";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";

interface NotificationTypeRowProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  recommended?: boolean;
}

function NotificationTypeRow({ 
  icon, 
  iconBg, 
  label, 
  description, 
  checked, 
  onCheckedChange,
  recommended 
}: NotificationTypeRowProps) {
  return (
    <div className="flex items-center justify-between py-3 group">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{label}</span>
            {recommended === false && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                рекомендуем выкл
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="ml-4"
      />
    </div>
  );
}

export function NotificationsSettings() {
  const { language } = useI18n();
  const isRu = language === 'ru';
  const { isSubscribed, isSupported, subscribe, unsubscribe } = useWebPush();
  const { 
    preferences, 
    isLoading: isLoadingPrefs, 
    updatePreference 
  } = useNotificationPreferences();
  const [isLoading, setIsLoading] = useState(false);

  const handlePushToggle = async () => {
    setIsLoading(true);
    try {
      if (isSubscribed) {
        await unsubscribe();
        toast.success(isRu ? 'Push-уведомления отключены' : 'Push notifications disabled');
      } else {
        await subscribe();
        toast.success(isRu ? 'Push-уведомления включены' : 'Push notifications enabled');
      }
    } catch (error) {
      toast.error(isRu ? 'Ошибка настройки уведомлений' : 'Error setting up notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const timeOptions = [
    '20:00', '21:00', '22:00', '23:00', '00:00'
  ];
  
  const endTimeOptions = [
    '06:00', '07:00', '08:00', '09:00', '10:00'
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Push Notifications Master Toggle */}
      <Card className="glass-card overflow-hidden">
        <div className="p-5 bg-gradient-to-r from-green-500/10 to-emerald-500/10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <Bell className="w-6 h-6 text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-foreground">
                    {isRu ? 'Push-уведомления' : 'Push Notifications'}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isRu 
                      ? 'Получай уведомления даже когда вкладка закрыта'
                      : 'Get notified even when the tab is closed'
                    }
                  </p>
                </div>
                {isSupported ? (
                  <Switch
                    checked={isSubscribed}
                    onCheckedChange={handlePushToggle}
                    disabled={isLoading}
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {isRu ? 'Не поддерживается' : 'Not supported'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Notification Types */}
      <Card className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="w-4 h-4 text-muted-foreground" />
          <h4 className="font-medium">
            {isRu ? 'Типы уведомлений' : 'Notification Types'}
          </h4>
        </div>
        
        <div className="space-y-1">
          {/* High priority - ON by default */}
          <NotificationTypeRow
            icon={<UserPlus className="w-4 h-4 text-blue-400" />}
            iconBg="bg-blue-500/20"
            label={isRu ? "Запросы в друзья" : "Friend Requests"}
            description={isRu ? "Когда кто-то хочет добавить вас" : "When someone wants to add you"}
            checked={preferences.pushFriendRequests}
            onCheckedChange={(v) => updatePreference('pushFriendRequests', v)}
            recommended={true}
          />
          
          <Separator className="my-1" />
          
          <NotificationTypeRow
            icon={<MessageCircle className="w-4 h-4 text-violet-400" />}
            iconBg="bg-violet-500/20"
            label={isRu ? "Личные сообщения" : "Private Messages"}
            description={isRu ? "Новые сообщения от друзей" : "New messages from friends"}
            checked={preferences.pushPrivateMessages}
            onCheckedChange={(v) => updatePreference('pushPrivateMessages', v)}
            recommended={true}
          />
          
          <Separator className="my-1" />
          
          <NotificationTypeRow
            icon={<AtSign className="w-4 h-4 text-orange-400" />}
            iconBg="bg-orange-500/20"
            label={isRu ? "Упоминания" : "Mentions"}
            description={isRu ? "Когда вас упоминают в сообществе" : "When you're mentioned in the community"}
            checked={preferences.pushMentions}
            onCheckedChange={(v) => updatePreference('pushMentions', v)}
            recommended={true}
          />
          
          <Separator className="my-2 opacity-50" />
          
          {/* Low priority - OFF by default */}
          <NotificationTypeRow
            icon={<Heart className="w-4 h-4 text-rose-400" />}
            iconBg="bg-rose-500/20"
            label={isRu ? "Реакции на посты" : "Post Reactions"}
            description={isRu ? "Когда кто-то реагирует на ваш пост" : "When someone reacts to your post"}
            checked={preferences.pushReactions}
            onCheckedChange={(v) => updatePreference('pushReactions', v)}
            recommended={false}
          />
          
          <Separator className="my-1" />
          
          <NotificationTypeRow
            icon={<MessageSquare className="w-4 h-4 text-cyan-400" />}
            iconBg="bg-cyan-500/20"
            label={isRu ? "Комментарии" : "Comments"}
            description={isRu ? "Комментарии к вашим постам" : "Comments on your posts"}
            checked={preferences.pushComments}
            onCheckedChange={(v) => updatePreference('pushComments', v)}
            recommended={false}
          />
        </div>
      </Card>

      {/* Quiet Hours */}
      <Card className="glass-card p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
            <Moon className="w-6 h-6 text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div>
                <h3 className="font-semibold text-foreground">
                  {isRu ? 'Тихие часы' : 'Quiet Hours'}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {isRu 
                    ? 'Не беспокоить в выбранное время'
                    : 'Do not disturb during selected hours'
                  }
                </p>
              </div>
              <Switch
                checked={preferences.quietHoursEnabled}
                onCheckedChange={(v) => updatePreference('quietHoursEnabled', v)}
              />
            </div>
            
            {preferences.quietHoursEnabled && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-center gap-3 mt-4 pt-3 border-t border-border/50"
              >
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">
                    {isRu ? 'С' : 'From'}
                  </Label>
                  <Select
                    value={preferences.quietHoursStart.slice(0, 5)}
                    onValueChange={(v) => updatePreference('quietHoursStart', v)}
                  >
                    <SelectTrigger className="w-24 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">
                    {isRu ? 'до' : 'to'}
                  </Label>
                  <Select
                    value={preferences.quietHoursEnd.slice(0, 5)}
                    onValueChange={(v) => updatePreference('quietHoursEnd', v)}
                  >
                    <SelectTrigger className="w-24 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {endTimeOptions.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </Card>

      {/* Sound & Vibration */}
      <Card className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
              {preferences.soundEnabled ? (
                <Volume2 className="w-4 h-4 text-amber-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-amber-400" />
              )}
            </div>
            <div>
              <span className="font-medium text-sm">
                {isRu ? 'Звук уведомлений' : 'Notification Sound'}
              </span>
              <p className="text-xs text-muted-foreground">
                {isRu ? 'Проигрывать звук для важных событий' : 'Play sound for important events'}
              </p>
            </div>
          </div>
          <Switch
            checked={preferences.soundEnabled}
            onCheckedChange={(v) => updatePreference('soundEnabled', v)}
          />
        </div>
        
        <Separator />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <span className="font-medium text-sm">
                {isRu ? 'Вибрация' : 'Vibration'}
              </span>
              <p className="text-xs text-muted-foreground">
                {isRu ? 'Вибрировать для важных уведомлений' : 'Vibrate for important notifications'}
              </p>
            </div>
          </div>
          <Switch
            checked={preferences.vibrationEnabled}
            onCheckedChange={(v) => updatePreference('vibrationEnabled', v)}
          />
        </div>
      </Card>

    </motion.div>
  );
}
