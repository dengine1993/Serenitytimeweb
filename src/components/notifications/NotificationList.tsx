import { useState, useEffect } from "react";
import { 
  Heart, Star, Clock, UserPlus, UserCheck, 
  MessageCircle, AtSign, MessageSquare, Check, BellOff 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { ru } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

type NotificationType = 'reaction' | 'system' | 'friend_request' | 'friend_accepted' | 'private_message' | 'mention' | 'comment';

interface UnifiedNotification {
  id: string;
  type: NotificationType;
  post_id?: string | null;
  actor_id?: string | null;
  reaction_type?: 'heart' | 'star';
  post_content?: string;
  title?: string;
  message?: string;
  systemType?: string;
  action_url?: string;
  is_read: boolean;
  created_at: string;
  actor_name?: string;
  actor_avatar?: string;
}

interface NotificationListProps {
  onClose?: () => void;
}

export function NotificationList({ onClose }: NotificationListProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<UnifiedNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (!user) return;

    const loadNotifications = async () => {
      setLoading(true);
      
      // Load all notifications
      const { data: notifData } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);

      // Load system notifications
      const { data: systemData } = await supabase
        .from('system_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      // Get unique actor IDs
      const actorIds = [...new Set((notifData || []).map(n => n.actor_id).filter(Boolean))] as string[];
      
      // Load actor profiles
      let actorsMap = new Map<string, { name: string; avatar: string }>();
      if (actorIds.length > 0) {
        const { data: actorsData } = await supabase
          .from('profiles')
          .select('user_id, display_name, username, avatar_url')
          .in('user_id', actorIds);
        
        actorsData?.forEach(actor => {
          actorsMap.set(actor.user_id, {
            name: actor.display_name || actor.username || 'Пользователь',
            avatar: actor.avatar_url || ''
          });
        });
      }

      // Get unique post IDs for reaction notifications
      const postIds = [...new Set((notifData || []).map(n => n.post_id).filter(Boolean))] as string[];
      let postsMap = new Map<string, string>();
      if (postIds.length > 0) {
        const { data: postsData } = await supabase
          .from('posts')
          .select('id, content')
          .in('id', postIds);
        postsData?.forEach(p => postsMap.set(p.id, p.content));
      }

      // Transform notifications
      const enrichedReactions: UnifiedNotification[] = (notifData || []).map(n => {
        const actor = actorsMap.get(n.actor_id || '');
        const notifType = n.type || 'reaction';
        
        return {
          id: n.id,
          type: notifType as NotificationType,
          post_id: n.post_id,
          actor_id: n.actor_id,
          reaction_type: n.reaction_type as 'heart' | 'star' | undefined,
          post_content: postsMap.get(n.post_id || ''),
          title: n.title,
          message: n.message,
          action_url: n.action_url,
          is_read: n.is_read ?? false,
          created_at: n.created_at,
          actor_name: actor?.name,
          actor_avatar: actor?.avatar,
        };
      });

      const enrichedSystem: UnifiedNotification[] = (systemData || []).map(s => ({
        id: s.id,
        type: 'system' as NotificationType,
        title: s.title,
        message: s.message,
        systemType: s.type,
        is_read: s.is_read ?? false,
        created_at: s.created_at,
      }));

      const allNotifications = [...enrichedReactions, ...enrichedSystem].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setNotifications(allNotifications);
      setLoading(false);
    };

    loadNotifications();

    const channel = supabase
      .channel('notifications-list-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, () => loadNotifications())
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'system_notifications',
        filter: `user_id=eq.${user.id}`
      }, () => loadNotifications())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleNotificationClick = (notification: UnifiedNotification) => {
    if (notification.action_url) {
      navigate(notification.action_url);
    } else {
      navigate('/app');
    }
    onClose?.();
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
    
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const getIcon = (notification: UnifiedNotification) => {
    const iconClass = "w-4 h-4";
    
    switch (notification.type) {
      case 'friend_request':
        return <UserPlus className={`${iconClass} text-blue-400`} />;
      case 'friend_accepted':
        return <UserCheck className={`${iconClass} text-emerald-400`} />;
      case 'private_message':
        return <MessageCircle className={`${iconClass} text-violet-400`} />;
      case 'mention':
        return <AtSign className={`${iconClass} text-orange-400`} />;
      case 'comment':
        return <MessageSquare className={`${iconClass} text-sky-400`} />;
      case 'system':
        return <Clock className={`${iconClass} text-violet-400`} />;
      case 'reaction':
      default:
        if (notification.reaction_type === 'heart') {
          return <Heart className={`${iconClass} fill-rose-400 text-rose-400`} />;
        }
        return <Star className={`${iconClass} fill-amber-400 text-amber-400`} />;
    }
  };

  const getNotificationText = (notification: UnifiedNotification) => {
    switch (notification.type) {
      case 'friend_request':
        return `${notification.actor_name || 'Кто-то'} хочет добавить вас в друзья`;
      case 'friend_accepted':
        return `${notification.actor_name || 'Кто-то'} принял ваш запрос в друзья`;
      case 'private_message':
        return `${notification.actor_name || 'Кто-то'} отправил вам сообщение`;
      case 'mention':
        return `${notification.actor_name || 'Кто-то'} упомянул вас`;
      case 'comment':
        return `${notification.actor_name || 'Кто-то'} прокомментировал ваш пост`;
      case 'system':
        return notification.title || 'Системное уведомление';
      case 'reaction':
      default:
        const reactionText = notification.reaction_type === 'heart' ? 'поддержал' : 'резонировал с';
        return `${notification.actor_name || 'Кто-то'} ${reactionText} вашим постом`;
    }
  };

  const groupNotificationsByDate = (notifications: UnifiedNotification[]) => {
    const today: UnifiedNotification[] = [];
    const yesterday: UnifiedNotification[] = [];
    const earlier: UnifiedNotification[] = [];

    notifications.forEach(n => {
      const date = new Date(n.created_at);
      if (isToday(date)) {
        today.push(n);
      } else if (isYesterday(date)) {
        yesterday.push(n);
      } else {
        earlier.push(n);
      }
    });

    return { today, yesterday, earlier };
  };

  const filteredNotifications = activeTab === 'unread' 
    ? notifications.filter(n => !n.is_read)
    : notifications;

  const grouped = groupNotificationsByDate(filteredNotifications);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="p-8 text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"
        />
      </div>
    );
  }

  const renderNotificationGroup = (title: string, items: UnifiedNotification[]) => {
    if (items.length === 0) return null;
    
    return (
      <div key={title}>
        <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-accent/30">
          {title}
        </div>
        <AnimatePresence mode="popLayout">
          {items.map((notification, index) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.03 }}
              className={`border-b border-border/30 last:border-0 ${!notification.is_read ? 'bg-primary/5' : ''}`}
            >
              <button
                onClick={() => handleNotificationClick(notification)}
                className="w-full p-4 text-left hover:bg-accent/50 transition-all duration-200 group"
              >
                <div className="flex gap-3">
                  {/* Avatar or Icon */}
                  <div className="flex-shrink-0">
                    {notification.actor_avatar ? (
                      <Avatar className="h-10 w-10 ring-2 ring-background">
                        <AvatarImage src={notification.actor_avatar} />
                        <AvatarFallback className="bg-primary/20 text-primary text-xs">
                          {notification.actor_name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-accent/50 flex items-center justify-center">
                        {getIcon(notification)}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <p className={`text-sm flex-1 ${!notification.is_read ? 'text-foreground font-medium' : 'text-foreground/80'}`}>
                        {getNotificationText(notification)}
                      </p>
                      {notification.actor_avatar && (
                        <div className="flex-shrink-0 opacity-60">
                          {getIcon(notification)}
                        </div>
                      )}
                    </div>
                    
                    {(notification.post_content || notification.message) && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {notification.type === 'system' 
                          ? notification.message 
                          : `"${notification.post_content}"`}
                      </p>
                    )}
                    
                    <p className="text-xs text-muted-foreground/60 mt-2">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                        locale: ru,
                      })}
                    </p>
                  </div>
                  
                  {/* Unread indicator */}
                  {!notification.is_read && (
                    <div className="flex-shrink-0 mt-2">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    </div>
                  )}
                </div>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="flex flex-col max-h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <h3 className="text-base font-semibold text-foreground">Уведомления</h3>
        {unreadCount > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={markAllAsRead}
            className="text-xs text-muted-foreground hover:text-foreground h-8"
          >
            <Check className="w-3 h-3 mr-1" />
            Прочитать все
          </Button>
        )}
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'unread')} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b border-border/50 bg-transparent p-0 h-10">
          <TabsTrigger 
            value="all" 
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Все
          </TabsTrigger>
          <TabsTrigger 
            value="unread"
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Непрочитанные
            {unreadCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-primary text-primary-foreground rounded-full">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="flex-1 mt-0 data-[state=inactive]:hidden">
          <ScrollArea className="h-[380px]">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <BellOff className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Пока нет уведомлений</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Когда кто-то отреагирует на ваш пост, вы увидите это здесь
                </p>
              </div>
            ) : (
              <>
                {renderNotificationGroup('Сегодня', grouped.today)}
                {renderNotificationGroup('Вчера', grouped.yesterday)}
                {renderNotificationGroup('Ранее', grouped.earlier)}
              </>
            )}
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="unread" className="flex-1 mt-0 data-[state=inactive]:hidden">
          <ScrollArea className="h-[380px]">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <Check className="w-12 h-12 mx-auto text-emerald-400/30 mb-3" />
                <p className="text-sm text-muted-foreground">Все прочитано!</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Нет непрочитанных уведомлений
                </p>
              </div>
            ) : (
              <>
                {renderNotificationGroup('Сегодня', grouped.today)}
                {renderNotificationGroup('Вчера', grouped.yesterday)}
                {renderNotificationGroup('Ранее', grouped.earlier)}
              </>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
