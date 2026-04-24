import { useState, useEffect, useCallback, useRef } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { NotificationList } from "./NotificationList";
import { NotificationToast } from "./NotificationToast";
import { playNotificationSound, playImportantSound, triggerVibration, triggerGentleVibration } from "@/lib/notificationSound";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { motion, AnimatePresence } from "framer-motion";

export interface ToastNotification {
  id: string;
  type: 'heart' | 'star' | 'system' | 'friend_request' | 'friend_accepted' | 'private_message' | 'mention' | 'comment';
  postContent?: string;
  systemTitle?: string;
  systemMessage?: string;
  systemType?: string;
  actorName?: string;
  actorAvatar?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

// High-priority notification types
const HIGH_PRIORITY_TYPES = ['friend_request', 'private_message', 'mention'];

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { 
    preferences, 
    shouldPlaySound, 
    shouldVibrate, 
    isQuietHoursActive 
  } = useNotificationPreferences();
  
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastData, setToastData] = useState<ToastNotification | null>(null);
  const [isNewNotification, setIsNewNotification] = useState(false);

  const loadUnreadCount = useCallback(async () => {
    if (!user) return;
    
    const [reactionsResult, systemResult] = await Promise.all([
      supabase
        .from('notifications')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('is_read', false),
      supabase
        .from('system_notifications')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('is_read', false)
    ]);

    const reactionsCount = reactionsResult.count || 0;
    const systemCount = systemResult.count || 0;
    setUnreadCount(reactionsCount + systemCount);
  }, [user]);

  // Handle notification sound and vibration based on preferences
  const handleNotificationFeedback = useCallback((type: string) => {
    // Skip all feedback during quiet hours
    if (isQuietHoursActive()) {
      console.log('[Notification] Quiet hours active, skipping feedback');
      return;
    }

    // Check if sound should play for this type
    if (shouldPlaySound(type)) {
      // High-priority notifications get immediate sound (bypass debounce)
      if (HIGH_PRIORITY_TYPES.includes(type)) {
        playImportantSound();
      } else {
        playNotificationSound();
      }
    }

    // Check if vibration should trigger
    if (shouldVibrate(type)) {
      if (HIGH_PRIORITY_TYPES.includes(type)) {
        triggerVibration();
      } else {
        triggerGentleVibration();
      }
    }
  }, [shouldPlaySound, shouldVibrate, isQuietHoursActive]);

  useEffect(() => {
    if (!user) return;

    loadUnreadCount();

    // Subscribe to realtime notifications from both tables
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          setUnreadCount(prev => prev + 1);
          setIsNewNotification(true);
          setTimeout(() => setIsNewNotification(false), 1000);
          
          const notification = payload.new as any;
          const notifType = notification.type || notification.reaction_type || 'reaction';
          
          // Play sound and vibrate based on preferences
          handleNotificationFeedback(notifType);

          // Load actor profile for avatar
          let actorName = '';
          let actorAvatar = '';
          if (notification.actor_id) {
            const { data: actorData } = await supabase
              .from('profiles')
              .select('display_name, username, avatar_url')
              .eq('user_id', notification.actor_id)
              .single();
            
            if (actorData) {
              actorName = actorData.display_name || actorData.username || 'Пользователь';
              actorAvatar = actorData.avatar_url || '';
            }
          }

          // Load post content for reaction notifications
          let postContent = '';
          if (notification.post_id) {
            const { data: postData } = await supabase
              .from('posts')
              .select('content')
              .eq('id', notification.post_id)
              .single();
            postContent = postData?.content || '';
          }

          setToastData({
            id: notification.id,
            type: notifType as ToastNotification['type'],
            postContent,
            systemTitle: notification.title,
            systemMessage: notification.message,
            actorName,
            actorAvatar,
            actionUrl: notification.action_url,
            metadata: notification.metadata,
          });
          setShowToast(true);

          setTimeout(() => {
            setShowToast(false);
          }, 5000);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_notifications',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          setUnreadCount(prev => prev + 1);
          setIsNewNotification(true);
          setTimeout(() => setIsNewNotification(false), 1000);
          
          // System notifications are treated as high-priority
          handleNotificationFeedback('mention');

          const notification = payload.new as any;
          setToastData({
            id: notification.id,
            type: 'system',
            systemTitle: notification.title,
            systemMessage: notification.message,
            systemType: notification.type,
          });
          setShowToast(true);

          setTimeout(() => {
            setShowToast(false);
          }, 5000);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadUnreadCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'system_notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadUnreadCount, handleNotificationFeedback]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && unreadCount > 0) {
      markAllAsRead();
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    await Promise.all([
      supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false),
      supabase
        .from('system_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
    ]);

    setUnreadCount(0);
  };

  const handleToastClick = () => {
    setShowToast(false);
    if (toastData?.actionUrl) {
      navigate(toastData.actionUrl);
    } else if (toastData?.type === 'system') {
      navigate('/app');
    } else {
      navigate('/app');
    }
  };

  const handleToastClose = () => {
    setShowToast(false);
  };

  if (!user) return null;

  return (
    <>
      <NotificationToast
        show={showToast}
        type={toastData?.type || 'heart'}
        postContent={toastData?.postContent}
        systemTitle={toastData?.systemTitle}
        systemMessage={toastData?.systemMessage}
        systemType={toastData?.systemType}
        actorName={toastData?.actorName}
        actorAvatar={toastData?.actorAvatar}
        onClose={handleToastClose}
        onClick={handleToastClick}
      />

      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-10 w-10 rounded-full bg-accent/30 hover:bg-accent/50 text-foreground/70 hover:text-foreground transition-all duration-200 hover:scale-105 group"
          >
            <motion.div
              animate={isNewNotification ? { rotate: [0, -15, 15, -10, 10, 0] } : {}}
              transition={{ duration: 0.5 }}
            >
              <Bell className="h-5 w-5 transition-transform group-hover:scale-110" />
            </motion.div>
            
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.span
                  key={unreadCount}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-background shadow-lg shadow-rose-500/30"
                >
                  <motion.span
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </motion.span>
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-96 p-0 border-border/50 backdrop-blur-xl bg-background/95 shadow-2xl rounded-2xl overflow-hidden" 
          align="end"
          sideOffset={8}
        >
          <NotificationList onClose={() => setIsOpen(false)} />
        </PopoverContent>
      </Popover>
    </>
  );
}
