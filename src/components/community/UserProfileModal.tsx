import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { usePrivateChats } from '@/hooks/usePrivateChats';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { useI18n } from '@/hooks/useI18n';
import { 
  MessageCircle, 
  UserPlus, 
  UserMinus, 
  UserCheck, 
  MoreHorizontal, 
  Ban, 
  Flag,
  X,
  Loader2,
  Clock
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CEO_USER_ID } from '@/lib/constants';
import { CEOAvatar } from '@/components/common/CEOAvatar';
import { CEOBadge } from '@/components/common/CEOBadge';

interface UserProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  is_premium?: boolean;
}

interface UserProfileModalProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartChat?: (conversationId: string) => void;
}

const EMOJI_AVATARS = ['🌿', '🌸', '🌊', '🌻', '🍀', '🦋', '🌈', '✨', '🌙', '☀️'];

export function UserProfileModal({ 
  userId, 
  open, 
  onOpenChange,
  onStartChat 
}: UserProfileModalProps) {
  const { user } = useAuth();
  const { t, language } = useI18n();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);
  
  
  const { 
    isFriend, 
    hasPendingRequest, 
    getIncomingRequest,
    sendFriendRequest, 
    acceptRequest,
    removeFriend,
    blockUser,
    isBlocked
  } = useFriends();
  
  const { startConversation } = usePrivateChats();

  // Load user profile
  useEffect(() => {
    if (!userId || !open) {
      setProfile(null);
      return;
    }

    const loadProfile = async () => {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, created_at, premium_until')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        const isPremium = data.premium_until && new Date(data.premium_until) > new Date();
        setProfile({
          ...data,
          is_premium: isPremium
        });
      }
      
      setIsLoading(false);
    };

    loadProfile();
  }, [userId, open]);

  const handleStartChat = async () => {
    if (!userId) return;
    
    setIsStartingChat(true);
    try {
      const result = await startConversation(userId);
      if (result?.conversationId) {
        onOpenChange(false);
        onStartChat?.(result.conversationId);
      } else if (result?.needsFriend) {
        toast.error(t('community.profile.errors.friendsOnly'));
      } else if (result?.blocked) {
        toast.error(t('community.profile.errors.doesNotAccept'));
      }
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
    setIsStartingChat(false);
  };

  const handleFriendAction = async () => {
    if (!userId) return;
    
    if (isFriend(userId)) {
      await removeFriend(userId);
    } else {
      const incomingRequest = getIncomingRequest(userId);
      if (incomingRequest) {
        await acceptRequest(incomingRequest.id);
      } else if (!hasPendingRequest(userId)) {
        await sendFriendRequest(userId);
      }
    }
  };

  const handleBlock = async () => {
    if (!userId) return;
    await blockUser(userId);
    onOpenChange(false);
    toast.success(t('community.profile.blocked'));
  };

  const getFriendButtonContent = () => {
    if (!userId) return { icon: UserPlus, label: t('community.profile.addFriend'), variant: 'outline' as const };

    if (isFriend(userId)) {
      return { icon: UserCheck, label: t('community.profile.friends'), variant: 'secondary' as const };
    }

    const incomingRequest = getIncomingRequest(userId);
    if (incomingRequest) {
      return { icon: UserPlus, label: t('community.profile.accept'), variant: 'default' as const };
    }

    if (hasPendingRequest(userId)) {
      return { icon: Clock, label: t('community.profile.sent'), variant: 'outline' as const };
    }

    return { icon: UserPlus, label: t('community.profile.addFriend'), variant: 'outline' as const };
  };

  const friendButton = getFriendButtonContent();
  const FriendIcon = friendButton.icon;
  
  // Generate emoji avatar
  const emojiIndex = userId ? userId.charCodeAt(0) % EMOJI_AVATARS.length : 0;
  const emojiAvatar = EMOJI_AVATARS[emojiIndex];
  
  const displayName = profile?.display_name || t('community.profile.anonymous');
  const isOwnProfile = user?.id === userId;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent 
          side="bottom" 
          className="h-[85vh] rounded-t-3xl px-0 pt-0 pb-safe overflow-hidden"
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : profile ? (
            <div className="flex flex-col h-full">
              {/* Header with gradient background */}
              <div className="relative">
                {/* Gradient background from avatar colors */}
                <div className="absolute inset-0 h-40 bg-gradient-to-b from-primary/20 via-primary/10 to-transparent" />
                
                {/* Avatar and name */}
                <div className="relative pt-8 pb-4 flex flex-col items-center">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="relative"
                  >
                    {userId === CEO_USER_ID ? (
                      <CEOAvatar
                        size="lg"
                        className="!h-28 !w-28"
                        avatarUrl={profile.avatar_url}
                      />
                    ) : (
                      <>
                        {/* Premium ring */}
                        <div className={cn(
                          "rounded-full p-1",
                          profile.is_premium && "bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-400"
                        )}>
                          <Avatar className="h-28 w-28 border-4 border-background">
                            {profile.avatar_url ? (
                              <AvatarImage src={profile.avatar_url} alt={displayName} />
                            ) : (
                              <AvatarFallback className="bg-gradient-to-br from-blue-100 to-pink-100 dark:from-blue-500/20 dark:to-pink-500/20 text-4xl">
                                {emojiAvatar}
                              </AvatarFallback>
                            )}
                          </Avatar>
                        </div>
                        
                        {/* Premium badge */}
                        {profile.is_premium && (
                          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center shadow-lg">
                            <span className="text-base">⭐</span>
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                  
                  <motion.h2 
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="mt-4 text-xl font-bold text-foreground flex items-center gap-2"
                  >
                    {displayName}
                    {userId === CEO_USER_ID && <CEOBadge />}
                  </motion.h2>
                </div>
              </div>
              
              {/* Action buttons */}
              {!isOwnProfile && (
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex justify-center gap-3 px-6 py-4"
                >
                  {/* Chat button */}
                  <Button
                    onClick={handleStartChat}
                    disabled={isStartingChat}
                    className="flex-1 max-w-[140px] h-12 rounded-xl gap-2"
                  >
                    {isStartingChat ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <MessageCircle className="h-5 w-5" />
                    )}
                    <span className="font-medium">{t('community.profile.chat')}</span>
                  </Button>
                  
                  {/* Friend button */}
                  <Button
                    onClick={handleFriendAction}
                    variant={friendButton.variant}
                    className="flex-1 max-w-[140px] h-12 rounded-xl gap-2"
                  >
                    <FriendIcon className="h-5 w-5" />
                    <span className="font-medium">{friendButton.label}</span>
                  </Button>
                  
                  
                  {/* Block Button */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleBlock}
                    className="h-12 w-12 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                    title={t('community.profile.block')}
                  >
                    <Ban className="h-5 w-5" />
                  </Button>
                </motion.div>
              )}
              
              {/* User info */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="flex-1 px-6 py-4 space-y-4 overflow-y-auto"
              >
                {/* Info items */}
                <div className="space-y-1">
                  <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg">📅</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {t('community.profile.memberSince', {
                          date: format(new Date(profile.created_at), 'MMMM yyyy', { locale: language === 'ru' ? ru : enUS }),
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">{t('community.profile.registrationDate')}</p>
                    </div>
                  </div>
                  
                  {profile.is_premium && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10">
                      <div className="w-10 h-10 rounded-full bg-amber-400/20 flex items-center justify-center">
                        <span className="text-lg">⭐</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                          {t('community.profile.premiumMember')}
                        </p>
                        <p className="text-xs text-amber-500/70">{t('community.profile.premiumActive')}</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <span className="text-4xl mb-4">🔍</span>
              <p>{t('community.profile.userNotFound')}</p>
            </div>
          )}
        </SheetContent>
      </Sheet>
      
    </>
  );
}
