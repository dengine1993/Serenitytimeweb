import { useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, UserCheck, Clock, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFriends } from '@/hooks/useFriends';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FriendRequestButtonProps {
  userId: string;
  size?: 'sm' | 'default' | 'icon';
  variant?: 'default' | 'ghost' | 'outline';
  className?: string;
  showLabel?: boolean;
}

export function FriendRequestButton({ 
  userId, 
  size = 'sm',
  variant = 'default',
  className,
  showLabel = true
}: FriendRequestButtonProps) {
  const { 
    isFriend, 
    hasPendingRequest, 
    sendFriendRequest, 
    acceptRequest, 
    getIncomingRequest,
    getFriendship,
    removeFriend
  } = useFriends();
  
  const [isLoading, setIsLoading] = useState(false);

  const friendStatus = isFriend(userId);
  const pendingStatus = hasPendingRequest(userId);

  const handleClick = async () => {
    setIsLoading(true);
    
    try {
      if (friendStatus) {
        // Already friends - option to remove
        const friendship = getFriendship(userId);
        if (friendship && confirm('Удалить из друзей?')) {
          await removeFriend(friendship.id);
          toast.success('Удалён из друзей');
        }
      } else if (pendingStatus === 'incoming') {
        // Accept incoming request
        const request = getIncomingRequest(userId);
        if (request) {
          await acceptRequest(request.id);
          toast.success('Запрос принят!');
        }
      } else if (pendingStatus === 'outgoing') {
        // Already sent - do nothing
        toast.info('Запрос уже отправлен');
      } else {
        // Send new request
        const result = await sendFriendRequest(userId);
        if (result.success) {
          toast.success('Запрос отправлен');
        } else if (result.alreadyFriends) {
          toast.info('Вы уже друзья');
        } else if (result.alreadySent) {
          toast.info('Запрос уже отправлен');
        } else if (result.privacyBlocked) {
          toast.info('Этот пользователь ограничил получение запросов в друзья', { icon: '🔒' });
        } else if (result.error) {
          toast.error('Не удалось отправить запрос');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonContent = () => {
    if (isLoading) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }

    if (friendStatus) {
      return (
        <>
          <UserCheck className="h-4 w-4" />
          {showLabel && <span className="ml-1.5">В друзьях</span>}
        </>
      );
    }

    if (pendingStatus === 'incoming') {
      return (
        <>
          <Check className="h-4 w-4" />
          {showLabel && <span className="ml-1.5">Принять</span>}
        </>
      );
    }

    if (pendingStatus === 'outgoing') {
      return (
        <>
          <Clock className="h-4 w-4" />
          {showLabel && <span className="ml-1.5">Отправлено</span>}
        </>
      );
    }

    return (
      <>
        <UserPlus className="h-4 w-4" />
        {showLabel && <span className="ml-1.5">В друзья</span>}
      </>
    );
  };

  const getButtonVariant = () => {
    if (friendStatus) return 'secondary';
    if (pendingStatus === 'incoming') return 'default';
    if (pendingStatus === 'outgoing') return 'outline';
    return variant;
  };

  return (
    <motion.div whileTap={{ scale: 0.95 }}>
      <Button
        size={size}
        variant={getButtonVariant()}
        onClick={handleClick}
        disabled={isLoading}
        className={cn(
          friendStatus && "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400",
          pendingStatus === 'incoming' && "bg-primary text-primary-foreground",
          className
        )}
      >
        {getButtonContent()}
      </Button>
    </motion.div>
  );
}
