import { useState } from 'react';
import { Search, MessageCircle, Loader2, Check, UserPlus, Lock, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePrivateChats } from '@/hooks/usePrivateChats';
import { useFriends } from '@/hooks/useFriends';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/useI18n';

interface UserSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationCreated?: (conversationId: string) => void;
}

interface SearchResult {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export function UserSearchModal({ open, onOpenChange, onConversationCreated }: UserSearchModalProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const { startConversation } = usePrivateChats();
  const { isFriend, hasPendingRequest, sendFriendRequest } = useFriends();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [processingUsers, setProcessingUsers] = useState<Set<string>>(new Set());

  const handleSearch = async () => {
    if (!query.trim() || query.length < 2) return;

    setIsSearching(true);
    
    const { data } = await supabase
      .from('profiles')
      .select('user_id, display_name, username, avatar_url')
      .neq('user_id', user?.id || '')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(10);

    setResults(data || []);
    setIsSearching(false);
  };

  const handleStartChat = async (userId: string) => {
    setProcessingUsers(prev => new Set(prev).add(userId));

    try {
      const result = await startConversation(userId);

      if (result.conversationId) {
        toast.success(t('privateChat.toasts.chatCreated'));
        onConversationCreated?.(result.conversationId);
        onOpenChange(false);
      } else if (result.blocked) {
        toast.error(t('privateChat.toasts.userDoesNotAccept'));
      } else if (result.needsFriend) {
        toast.info(t('privateChat.toasts.friendsOnly'));
        const friendResult = await sendFriendRequest(userId);
        if (friendResult.success) {
          toast.success(t('privateChat.toasts.friendRequestSent'));
        } else if (friendResult.alreadyFriends) {
          const retryResult = await startConversation(userId);
          if (retryResult.conversationId) {
            onConversationCreated?.(retryResult.conversationId);
            onOpenChange(false);
          }
        } else if (friendResult.alreadySent) {
          toast.info(t('privateChat.toasts.friendRequestAlreadySent'));
        }
      } else if (result.error) {
        toast.error(t('privateChat.toasts.startChatFailed'));
      }
    } finally {
      setProcessingUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const handleAddFriend = async (userId: string) => {
    setProcessingUsers(prev => new Set(prev).add(userId));
    
    try {
      const result = await sendFriendRequest(userId);
      if (result.success) {
        toast.success(t('privateChat.toasts.requestSent'));
      } else if (result.alreadyFriends) {
        toast.info(t('privateChat.toasts.alreadyFriends'));
      } else if (result.alreadySent) {
        toast.info(t('privateChat.toasts.requestAlreadySent'));
      }
    } finally {
      setProcessingUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('privateChat.search.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={t('privateChat.search.placeholder')}
                className="pl-9"
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching || query.length < 2}>
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('privateChat.search.find')
              )}
            </Button>
          </div>

          {/* Results */}
          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {results.length === 0 && query && !isSearching && (
              <p className="text-center text-sm text-muted-foreground py-4">
                {t('privateChat.search.noResults')}
              </p>
            )}
            
            {results.map((profile) => {
              const name = profile.display_name || t('privateChat.screen.user');
              const isProcessing = processingUsers.has(profile.user_id);
              const isUserFriend = isFriend(profile.user_id);
              const pendingStatus = hasPendingRequest(profile.user_id);

              return (
                <div
                  key={profile.user_id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profile.avatar_url || ''} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {name[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-foreground truncate">
                        {name}
                      </p>
                      {isUserFriend && (
                        <Users className="h-3.5 w-3.5 text-green-500" />
                      )}
                    </div>
                    {profile.username && (
                      <p className="text-xs text-muted-foreground">
                        @{profile.username}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-1.5">
                    {/* Add friend button (if not friend and no pending) */}
                    {!isUserFriend && !pendingStatus && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleAddFriend(profile.user_id)}
                        disabled={isProcessing}
                        className="h-9 w-9 rounded-full"
                        title={t('privateChat.search.addFriend')}
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {/* Start chat button */}
                    <Button
                      size="sm"
                      onClick={() => handleStartChat(profile.user_id)}
                      disabled={isProcessing}
                      className="shrink-0"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <MessageCircle className="h-4 w-4 mr-1" />
                          {t('privateChat.search.write')}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            {t('privateChat.search.footer')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
