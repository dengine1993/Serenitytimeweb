import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserPlus, Check, X, Search, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useFriends } from '@/hooks/useFriends';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '@/lib/utils';

interface FriendsListProps {
  onSelectUser?: (userId: string) => void;
}

export function FriendsList({ onSelectUser }: FriendsListProps) {
  const { language } = useI18n();
  const isRu = language === 'ru';
  
  const { 
    friends, 
    incomingRequests, 
    isLoading,
    acceptRequest,
    declineRequest,
    removeFriend
  } = useFriends();
  
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFriends = friends.filter(f => {
    const name = f.friend_profile?.display_name || '';
    const username = f.friend_profile?.username || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           username.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={isRu ? "Поиск друзей..." : "Search friends..."}
          className="pl-9 bg-muted/50 border-0"
        />
      </div>

      {/* Incoming requests */}
      {incomingRequests.length > 0 && (
        <Card className="p-4 border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-center gap-2 mb-3">
            <UserPlus className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
              {isRu ? 'Запросы в друзья' : 'Friend requests'} ({incomingRequests.length})
            </span>
          </div>
          <div className="space-y-2">
            <AnimatePresence>
              {incomingRequests.map(request => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="flex items-center gap-3 p-2 rounded-xl bg-background/80"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={request.sender?.avatar_url || ''} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {(request.sender?.display_name || '?')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {request.sender?.display_name || 'Пользователь'}
                    </p>
                    {request.sender?.username && (
                      <p className="text-xs text-muted-foreground">@{request.sender.username}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => acceptRequest(request.id)}
                      className="h-8 w-8 rounded-full hover:bg-green-100 dark:hover:bg-green-900/30"
                    >
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => declineRequest(request.id)}
                      className="h-8 w-8 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30"
                    >
                      <X className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </Card>
      )}

      {/* Friends list */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            {isRu ? 'Друзья' : 'Friends'} ({filteredFriends.length})
          </span>
        </div>

        {filteredFriends.length === 0 ? (
          <div className="text-center py-6">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">
              {searchQuery 
                ? (isRu ? 'Никого не найдено' : 'No friends found')
                : (isRu ? 'Пока нет друзей' : 'No friends yet')
              }
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <AnimatePresence>
              {filteredFriends.map(friend => (
                <motion.button
                  key={friend.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => onSelectUser?.(friend.friend_profile?.user_id || '')}
                  className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-xl",
                    "hover:bg-muted/50 transition-colors text-left"
                  )}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={friend.friend_profile?.avatar_url || ''} />
                    <AvatarFallback className="bg-gradient-to-br from-sky-100 to-blue-100 dark:from-sky-900 dark:to-blue-900 text-primary">
                      {(friend.friend_profile?.display_name || '?')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {friend.friend_profile?.display_name || 'Пользователь'}
                    </p>
                    {friend.friend_profile?.username && (
                      <p className="text-xs text-muted-foreground">@{friend.friend_profile.username}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {isRu ? 'В друзьях' : 'Friend'}
                  </Badge>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}
      </Card>
    </div>
  );
}
