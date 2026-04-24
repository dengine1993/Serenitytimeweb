import { motion, AnimatePresence } from "framer-motion";
import { 
  Heart, Star, X, Clock, Headphones, Mail, 
  UserPlus, UserCheck, MessageCircle, AtSign, MessageSquare 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState } from "react";

interface NotificationToastProps {
  show: boolean;
  type: 'heart' | 'star' | 'system' | 'friend_request' | 'friend_accepted' | 'private_message' | 'mention' | 'comment';
  postContent?: string;
  systemTitle?: string;
  systemMessage?: string;
  systemType?: string;
  actorName?: string;
  actorAvatar?: string;
  onClose: () => void;
  onClick: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
}

export function NotificationToast({
  show,
  type,
  postContent,
  systemTitle,
  systemMessage,
  systemType,
  actorName,
  actorAvatar,
  onClose,
  onClick,
  onAccept,
  onDecline
}: NotificationToastProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (show) {
      setProgress(100);
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev <= 0) {
            clearInterval(interval);
            return 0;
          }
          return prev - 2;
        });
      }, 100);
      
      return () => clearInterval(interval);
    }
  }, [show]);

  const getIcon = () => {
    const iconClass = "w-5 h-5";
    
    switch (type) {
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
        if (systemType === 'trial_day_5') {
          return <Clock className={`${iconClass} text-amber-400`} />;
        }
        if (systemType === 'trial_day_7') {
          return <Headphones className={`${iconClass} text-emerald-400`} />;
        }
        if (systemType === 'trial_day_8') {
          return <Mail className={`${iconClass} text-rose-400`} />;
        }
        return <Clock className={`${iconClass} text-violet-400`} />;
      case 'heart':
        return <Heart className={`${iconClass} fill-rose-400 text-rose-400`} />;
      case 'star':
        return <Star className={`${iconClass} fill-amber-400 text-amber-400`} />;
      default:
        return <Heart className={`${iconClass} fill-rose-400 text-rose-400`} />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'friend_request':
        return `${actorName || 'Кто-то'} хочет добавить вас в друзья`;
      case 'friend_accepted':
        return `${actorName || 'Кто-то'} принял ваш запрос`;
      case 'private_message':
        return `Новое сообщение от ${actorName || 'пользователя'}`;
      case 'mention':
        return `${actorName || 'Кто-то'} упомянул вас`;
      case 'comment':
        return `${actorName || 'Кто-то'} прокомментировал ваш пост`;
      case 'system':
        return systemTitle || 'Уведомление';
      case 'heart':
        return `${actorName || 'Кто-то'} поддержал ваш пост`;
      case 'star':
        return `${actorName || 'Кто-то'} резонировал с вашим постом`;
      default:
        return 'Новое уведомление';
    }
  };

  const getSubtitle = () => {
    if (type === 'system') return systemMessage;
    if (postContent) return `"${postContent.substring(0, 60)}${postContent.length > 60 ? '...' : ''}"`;
    return null;
  };

  const showActionButtons = type === 'friend_request' && onAccept && onDecline;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -100, x: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, x: 20, scale: 0.9 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 30 
          }}
          className="fixed top-4 right-4 z-[100] w-[380px] max-w-[calc(100vw-2rem)]"
        >
          <motion.div
            initial={{ boxShadow: "0 0 0 rgba(139,92,246,0)" }}
            animate={{ 
              boxShadow: [
                "0 0 0 rgba(139,92,246,0)",
                "0 0 40px rgba(139,92,246,0.4)",
                "0 0 20px rgba(139,92,246,0.2)"
              ]
            }}
            transition={{ duration: 1.5, times: [0, 0.3, 1] }}
            className="relative overflow-hidden bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl"
          >
            {/* Glass reflection effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
            
            <button
              onClick={onClick}
              className="w-full text-left p-4 group"
            >
              <div className="flex gap-3">
                {/* Avatar or Icon */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 500, 
                    damping: 20,
                    delay: 0.1 
                  }}
                  className="flex-shrink-0"
                >
                  {actorAvatar ? (
                    <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                      <AvatarImage src={actorAvatar} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {actorName?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-accent/50 flex items-center justify-center">
                      {getIcon()}
                    </div>
                  )}
                </motion.div>

                <div className="flex-1 min-w-0 pr-8">
                  <motion.p
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 }}
                    className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2"
                  >
                    {getTitle()}
                  </motion.p>

                  {getSubtitle() && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.25 }}
                      className="text-xs text-muted-foreground mt-1 line-clamp-2"
                    >
                      {getSubtitle()}
                    </motion.p>
                  )}

                  {!showActionButtons && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.35 }}
                      className="text-xs text-primary/60 mt-2 group-hover:text-primary/80 transition-colors"
                    >
                      Нажмите, чтобы посмотреть →
                    </motion.p>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Action buttons for friend requests */}
              {showActionButtons && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex gap-2 mt-3 pl-15"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button 
                    size="sm" 
                    onClick={onAccept}
                    className="flex-1 bg-primary hover:bg-primary/90"
                  >
                    Принять
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={onDecline}
                    className="flex-1"
                  >
                    Отклонить
                  </Button>
                </motion.div>
              )}
            </button>

            {/* Progress bar */}
            <motion.div
              className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-primary/50 to-primary rounded-full"
              initial={{ width: '100%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1, ease: "linear" }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
