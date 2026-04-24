import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { CommunityRulesModal } from '@/components/community/CommunityRulesModal';
import { CommunityHeader } from '@/components/community/CommunityHeader';
import { CommunityMessage, DateSeparator } from '@/components/community/CommunityMessage';
import { CommunityInput } from '@/components/community/CommunityInput';
import { PinnedMessagesBar } from '@/components/community/PinnedMessagesBar';
import { TypingIndicator } from '@/components/community/TypingIndicator';
import { UserProfileModal } from '@/components/community/UserProfileModal';
import { useCommunityRestriction } from '@/hooks/useCommunityRestriction';
import { usePrivateChats } from '@/hooks/usePrivateChats';
import { PrivateChatsTab } from '@/components/private-chat/PrivateChatsTab';
import { StoriesTab } from '@/components/stories/StoriesTab';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/hooks/useI18n';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';


import { BottomDock } from '@/components/navigation/BottomDock';
import { Loader2, ChevronUp, ArrowDown, ShieldAlert, Users, MessageCircle, WifiOff, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useMessageReadReceipts } from '@/hooks/useMessageReadReceipts';
import { toast } from 'sonner';
import SEO from '@/components/SEO';
import { isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  media_url?: string | null;
  media_type?: string | null;
  reply_to_id?: string | null;
  is_premium?: boolean;
  author?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

const MESSAGES_PER_PAGE = 50;

export default function Community() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'community' | 'private' | 'stories'>('community');
  const [pendingConversationId, setPendingConversationId] = useState<string | null>(null);
  const [rulesAccepted, setRulesAccepted] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pinnedMessageIds, setPinnedMessageIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const { isAdmin } = useIsAdmin();
  const [onlineCount, setOnlineCount] = useState(0);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { typingUsers, startTyping, stopTyping } = useTypingIndicator();
  const { isRestricted, remainingTime } = useCommunityRestriction();
  const { isOnline } = useNetworkStatus();
  const { startConversation } = usePrivateChats();
  

  // Read receipts
  const messageIds = useMemo(() => messages.map(m => m.id), [messages]);
  const { markAsRead, getReadCount } = useMessageReadReceipts(messageIds);

  // Role is now handled by useCanDelete hook

  // Load pinned message IDs
  useEffect(() => {
    const loadPinnedIds = async () => {
      const { data } = await supabase
        .from('pinned_community_messages')
        .select('message_id');

      if (data) {
        setPinnedMessageIds(new Set(data.map(p => p.message_id)));
      }
    };

    loadPinnedIds();

    // Subscribe to pinned changes
    const channel = supabase
      .channel('pinned-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pinned_community_messages'
      }, () => {
        loadPinnedIds();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Check if user accepted rules
  useEffect(() => {
    const checkRulesAccepted = async () => {
      if (!user) {
        setRulesAccepted(false);
        setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from('community_rules_accepted')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      setRulesAccepted(!!data);
      setIsLoading(false);
    };

    checkRulesAccepted();
  }, [user]);

  // Load messages
  const loadMessages = useCallback(async (before?: string) => {
    let query = supabase
      .from('community_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(MESSAGES_PER_PAGE);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: messagesData } = await query;

    if (messagesData) {
      // Fetch profiles for authors with premium status
      const userIds = [...new Set(messagesData.map(m => m.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, premium_until')
        .in('user_id', userIds);
      
      // Get premium user IDs using security definer function (bypasses RLS)
      const { data: premiumIds } = await supabase
        .rpc('get_premium_user_ids', { user_ids: userIds });
      
      const premiumUserIds = new Set(premiumIds || []);

      const profileMap = new Map(profiles?.map(p => [p.user_id, {
        ...p,
        is_premium: premiumUserIds.has(p.user_id) || (p.premium_until && new Date(p.premium_until) > new Date())
      }]) || []);

      const processedMessages = messagesData
        .map(msg => {
          const profile = profileMap.get(msg.user_id);
          return {
            ...msg,
            author: profile ? { display_name: profile.display_name, avatar_url: profile.avatar_url } : undefined,
            is_premium: profile?.is_premium || false
          };
        })
        .reverse(); // Reverse to get chronological order

      if (before) {
        // Prepend older messages
        setMessages(prev => [...processedMessages, ...prev]);
      } else {
        setMessages(processedMessages);
      }

      setHasMore(messagesData.length === MESSAGES_PER_PAGE);
    }
  }, []);

  const loadMoreMessages = async () => {
    if (isLoadingMore || !hasMore || messages.length === 0) return;

    setIsLoadingMore(true);
    const oldestMessage = messages[0];
    await loadMessages(oldestMessage.created_at);
    setIsLoadingMore(false);
  };

  useEffect(() => {
    if (!rulesAccepted) return;

    loadMessages();

    // Subscribe to messages (INSERT, UPDATE, DELETE)
    const channel = supabase
      .channel('community-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'community_messages'
      }, async (payload) => {
        const newMsg = payload.new as any;
        
        // Fetch author profile with premium status
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url, premium_until')
          .eq('user_id', newMsg.user_id)
          .maybeSingle();

        // Check premium status using security definer function (bypasses RLS)
        const { data: premiumIds } = await supabase
          .rpc('get_premium_user_ids', { user_ids: [newMsg.user_id] });

        const isPremium = premiumIds?.includes(newMsg.user_id) || 
          (profile?.premium_until && new Date(profile.premium_until) > new Date());

        setMessages(prev => [...prev, {
          ...newMsg,
          author: profile ? { display_name: profile.display_name, avatar_url: profile.avatar_url } : undefined,
          is_premium: isPremium
        }]);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'community_messages'
      }, (payload) => {
        const updatedMsg = payload.new as any;
        setMessages(prev => prev.map(msg => 
          msg.id === updatedMsg.id 
            ? { ...msg, content: updatedMsg.content, media_url: updatedMsg.media_url, media_type: updatedMsg.media_type }
            : msg
        ));
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'community_messages'
      }, (payload) => {
        const deletedMsg = payload.old as any;
        setMessages(prev => prev.filter(msg => msg.id !== deletedMsg.id));
      })
      .subscribe();

    // Track online presence
    const presenceChannel = supabase
      .channel('community-presence')
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        setOnlineCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && user) {
          await presenceChannel.track({ user_id: user.id });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(presenceChannel);
    };
  }, [rulesAccepted, user, loadMessages]);

  // Scroll to bottom on new messages (only for new messages, not when loading old ones)
  const prevMessagesLength = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      // Only scroll if new messages were added at the end
      const lastMessage = messages[messages.length - 1];
      const prevLastMessage = messages[prevMessagesLength.current - 1];
      if (!prevLastMessage || new Date(lastMessage.created_at) > new Date(prevLastMessage.created_at)) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
    prevMessagesLength.current = messages.length;
  }, [messages]);

  const acceptRules = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    await supabase
      .from('community_rules_accepted')
      .insert({ user_id: user.id });

    setRulesAccepted(true);
  };

  const sendMessage = async (content: string, mediaUrl?: string, mediaType?: string, replyToId?: string) => {
    if (!user || (!content.trim() && !mediaUrl)) return;

    stopTyping();

    try {
      const { data: messageId, error } = await supabase.rpc('send_community_message', {
        p_content: content.trim() || '',
        p_media_url: mediaUrl || null,
        p_media_type: mediaType || null,
        p_reply_to_id: replyToId || null
      });

      if (error) {
        if (error.message.includes('Rate limit')) {
          toast.error('Подождите пару секунд перед отправкой');
        } else if (error.message.includes('too long')) {
          toast.error('Сообщение слишком длинное (макс. 2000 символов)');
        } else if (error.message.includes('cannot be empty')) {
          toast.error('Сообщение не может быть пустым');
        } else {
          toast.error('Не удалось отправить сообщение');
          console.error('Send message error:', error);
        }
        return;
      }

      // If message contains mentions, send notifications
      if (content.includes('@')) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', user.id)
          .maybeSingle();
        
        const senderName = profile?.display_name || 'Пользователь';
        
        // Call notify-mention edge function
        supabase.functions.invoke('notify-mention', {
          body: {
            messageContent: content.trim(),
            senderName,
            senderId: user.id
          }
        }).catch(err => console.error('Failed to send mention notifications:', err));
      }
      
      setReplyTo(null);
    } catch (err) {
      toast.error('Ошибка при отправке сообщения');
      console.error('Send message error:', err);
    }
  };

  const editMessage = async (id: string, newContent: string) => {
    if (!user) return;
    
    await supabase
      .from('community_messages')
      .update({ content: newContent })
      .eq('id', id)
      .eq('user_id', user.id);
    
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, content: newContent } : msg
    ));
  };

  const deleteMessage = async (id: string) => {
    if (!user) return;
    
    const targetMessage = messages.find(m => m.id === id);
    if (!targetMessage) return;

    // Admin can delete any message, regular user can only delete own
    if (targetMessage.user_id !== user.id && !isAdmin) {
      toast.error('Нет прав для удаления этого сообщения');
      return;
    }

    const { error } = await supabase
      .from('community_messages')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Не удалось удалить сообщение');
      return;
    }
    
    setMessages(prev => prev.filter(msg => msg.id !== id));
  };

  const pinMessage = async (messageId: string) => {
    if (!user || !isAdmin) return;

    const { error } = await supabase
      .from('pinned_community_messages')
      .insert({
        message_id: messageId,
        pinned_by: user.id
      });

    if (error) {
      toast.error('Не удалось закрепить сообщение');
      return;
    }

    toast.success('Сообщение закреплено');
  };

  const unpinMessage = async (messageId: string) => {
    if (!user || !isAdmin) return;

    const { error } = await supabase
      .from('pinned_community_messages')
      .delete()
      .eq('message_id', messageId);

    if (error) {
      toast.error('Не удалось открепить сообщение');
      return;
    }

    toast.success('Сообщение откреплено');
  };

  const scrollToMessage = (messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('animate-pulse');
      setTimeout(() => element.classList.remove('animate-pulse'), 2000);
    }
  };

  // Handler to start private chat from message context menu
  const handleStartChat = async (userId: string) => {
    if (!user) {
      toast.error('Войдите, чтобы написать в личку');
      return;
    }
    
    const result = await startConversation(userId);
    
    if (result.error) {
      toast.error(result.error);
      return;
    }
    
    if (result.needsFriend) {
      toast.info('Добавьте пользователя в друзья, чтобы написать');
      return;
    }
    
    if (result.blocked) {
      toast.info('Этот пользователь ограничил приём личных сообщений', { icon: '🔒' });
      return;
    }
    
    if (result.conversationId) {
      // Pass the conversation ID to PrivateChatsTab to open it directly
      setPendingConversationId(result.conversationId);
      setActiveTab('private');
    }
  };

  // Filter messages by search query
  const filteredMessages = searchQuery
    ? messages.filter(msg => 
        msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.author?.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  // Group messages by date and author for better UX
  const groupedMessages = useMemo(() => {
    return filteredMessages.map((message, index) => {
      const prevMessage = filteredMessages[index - 1];
      const nextMessage = filteredMessages[index + 1];
      
      const messageDate = new Date(message.created_at);
      const prevDate = prevMessage ? new Date(prevMessage.created_at) : null;
      
      // Check if we need a date separator
      const showDateSeparator = !prevDate || !isSameDay(messageDate, prevDate);
      
      // Check if this is first/last in a group from same author (within 5 minutes)
      const isSameAuthorAsPrev = prevMessage?.user_id === message.user_id;
      const isSameAuthorAsNext = nextMessage?.user_id === message.user_id;
      
      const prevTime = prevMessage ? new Date(prevMessage.created_at).getTime() : 0;
      const nextTime = nextMessage ? new Date(nextMessage.created_at).getTime() : 0;
      const currentTime = messageDate.getTime();
      
      const withinGroupTimePrev = currentTime - prevTime < 5 * 60 * 1000; // 5 minutes
      const withinGroupTimeNext = nextTime - currentTime < 5 * 60 * 1000;
      
      const isFirstInGroup = !isSameAuthorAsPrev || !withinGroupTimePrev || showDateSeparator;
      const isLastInGroup = !isSameAuthorAsNext || !withinGroupTimeNext;
      
      return {
        message,
        showDateSeparator,
        isFirstInGroup,
        isLastInGroup,
      };
    });
  }, [filteredMessages]);

  // Scroll to bottom button state
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  const handleScroll = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
      setShowScrollButton(!isNearBottom);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-sky-50/50 via-blue-50/30 to-pink-50/30 dark:from-background dark:via-background dark:to-background">
        <div className="p-4 border-b border-border/30">
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className={`flex items-end gap-2 ${i % 2 === 0 ? 'justify-end' : ''}`}>
              {i % 2 !== 0 && <Skeleton className="h-9 w-9 rounded-full shrink-0" />}
              <div className="space-y-1">
                {i % 2 !== 0 && <Skeleton className="h-3 w-20" />}
                <Skeleton className={`h-16 rounded-2xl ${i % 2 === 0 ? 'w-48' : 'w-56'}`} />
              </div>
              {i % 2 === 0 && <Skeleton className="h-9 w-9 rounded-full shrink-0" />}
            </div>
          ))}
        </div>
        <BottomDock />
      </div>
    );
  }

  if (!rulesAccepted) {
    return (
      <>
        <SEO title="Сообщество — Безмятежные" description="Общайся с понимающими людьми в спокойном чате" />
        <CommunityRulesModal onAccept={acceptRules} isLoggedIn={!!user} />
      </>
    );
  }

  return (
    <>
      <SEO title="Сообщество — Безмятежные" description="Общайся с понимающими людьми в спокойном чате" />
      
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-sky-50/50 via-blue-50/30 to-pink-50/30 dark:from-background dark:via-background dark:to-background">
        <CommunityHeader 
          onlineCount={Math.max(onlineCount, 1)} 
          searchQuery={activeTab === 'community' ? searchQuery : ''}
          onSearchChange={setSearchQuery}
        />
        
        {/* Offline indicator */}
        {!isOnline && (
          <div className="bg-destructive/10 text-destructive text-sm px-4 py-2 text-center border-b border-destructive/20">
            <span className="inline-flex items-center gap-2">
              <WifiOff className="h-4 w-4" />
              Нет подключения к интернету
            </span>
          </div>
        )}
        
        {/* Tab switcher */}
        <div className="flex gap-1 px-4 py-2 bg-background/50 backdrop-blur-sm border-b border-border/30 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveTab('community')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
              activeTab === 'community'
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Users className="h-4 w-4" />
            {t('community.tabs.general')}
          </button>
          <button
            onClick={() => setActiveTab('private')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
              activeTab === 'private'
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <MessageCircle className="h-4 w-4" />
            {t('community.tabs.private')}
          </button>
          <button
            onClick={() => setActiveTab('stories')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
              activeTab === 'stories'
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <BookOpen className="h-4 w-4" />
            {t('community.tabs.stories')}
          </button>
        </div>
        
        {/* Stories tab */}
        {activeTab === 'stories' ? (
          <>
            <div className="flex-1 min-h-0 overflow-hidden">
              <StoriesTab />
            </div>
            <BottomDock />
          </>
        ) : activeTab === 'private' ? (
          <>
            <div className="flex-1 min-h-0 overflow-hidden">
              <PrivateChatsTab 
                initialConversationId={pendingConversationId}
                onConversationOpened={() => setPendingConversationId(null)}
              />
            </div>
            <BottomDock />
          </>
        ) : (
          <>
            <PinnedMessagesBar 
              isAdmin={isAdmin}
              onScrollToMessage={scrollToMessage}
            />
            
            {/* Messages area */}
        <div 
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-4 pb-44 space-y-1"
        >
          {/* Load more button */}
          {hasMore && !searchQuery && (
            <div className="flex justify-center py-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadMoreMessages}
                disabled={isLoadingMore}
                className="text-muted-foreground"
              >
                {isLoadingMore ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ChevronUp className="h-4 w-4 mr-2" />
                )}
                Загрузить ранние сообщения
              </Button>
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {groupedMessages.map(({ message, showDateSeparator, isFirstInGroup, isLastInGroup }, index) => (
              <div key={message.id} id={`message-${message.id}`}>
                {showDateSeparator && (
                  <DateSeparator date={new Date(message.created_at)} />
                )}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index < 10 ? index * 0.03 : 0 }}
                  className={!isLastInGroup ? "mb-0.5" : "mb-2"}
                >
                  <CommunityMessage
                    message={message}
                    isOwn={message.user_id === user?.id}
                    isAdmin={isAdmin}
                    isPinned={pinnedMessageIds.has(message.id)}
                    isLastInGroup={isLastInGroup}
                    onEdit={editMessage}
                    onDelete={deleteMessage}
                    onReply={() => setReplyTo(message)}
                    onPin={pinMessage}
                    onUnpin={unpinMessage}
                    replyToMessage={message.reply_to_id ? messages.find(m => m.id === message.reply_to_id) : undefined}
                    readCount={getReadCount(message.id, message.user_id)}
                    onVisible={() => {
                      if (message.user_id !== user?.id) {
                        markAsRead(message.id);
                      }
                    }}
                    onUserClick={setSelectedUserId}
                    onStartChat={handleStartChat}
                  />
                </motion.div>
              </div>
            ))}
          </AnimatePresence>
          
          {filteredMessages.length === 0 && !searchQuery && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-4xl mb-4">🌿</div>
              <p className="text-muted-foreground">
                Будь первым, кто напишет!<br />
                Поделись добрым словом 💚
              </p>
            </div>
          )}

          {filteredMessages.length === 0 && searchQuery && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-4xl mb-4">🔍</div>
              <p className="text-muted-foreground">
                Ничего не найдено по запросу<br />
                "{searchQuery}"
              </p>
            </div>
          )}
          
          {/* Typing indicator */}
          <AnimatePresence>
            {typingUsers.length > 0 && (
              <TypingIndicator typingUsers={typingUsers} />
            )}
          </AnimatePresence>
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Scroll to bottom button */}
        <AnimatePresence>
          {showScrollButton && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="fixed bottom-36 right-4 z-30"
            >
              <Button
                size="icon"
                onClick={scrollToBottom}
                className="h-10 w-10 rounded-full shadow-lg bg-primary hover:bg-primary/90"
              >
                <ArrowDown className="h-5 w-5" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Restriction banner */}
        {isRestricted && (
          <div className="fixed bottom-28 left-4 right-4 z-40 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center gap-3 backdrop-blur-sm">
            <ShieldAlert className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                Функции сообщества временно ограничены
              </p>
              {remainingTime && (
                <p className="text-xs text-amber-500/70">
                  Осталось: {remainingTime}
                </p>
              )}
            </div>
          </div>
        )}
        
        {/* Input */}
        <CommunityInput 
          onSend={sendMessage} 
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          onTyping={startTyping}
          disabled={isRestricted}
        />
        
        <BottomDock />
          </>
        )}
        
        {/* User profile modal */}
        <UserProfileModal
          userId={selectedUserId}
          open={!!selectedUserId}
          onOpenChange={(open) => !open && setSelectedUserId(null)}
          onStartChat={(conversationId) => {
            setActiveTab('private');
            // The private chats tab will show the conversation
          }}
        />
      </div>
    </>
  );
}
