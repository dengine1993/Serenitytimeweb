import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { 
  MessageCircle, 
  Plus, 
  Search
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { usePrivateChats, PrivateConversation } from '@/hooks/usePrivateChats';
import { UserSearchModal } from './UserSearchModal';
import { cn } from '@/lib/utils';

interface PrivateChatListProps {
  onSelectConversation: (conversationId: string) => void;
}

export function PrivateChatList({ onSelectConversation }: PrivateChatListProps) {
  const { conversations, isLoading } = usePrivateChats();
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserSearch, setShowUserSearch] = useState(false);

  const filteredConversations = conversations.filter(conv => {
    const name = conv.other_user?.display_name || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border/40">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">Личные чаты</h2>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowUserSearch(true)}
            className="rounded-full hover:bg-primary/10"
          >
            <Plus className="h-5 w-5 text-primary" />
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск..."
            className="pl-9 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
          />
        </div>
      </div>


      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="divide-y divide-border/30">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-40 bg-muted/70 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'Ничего не найдено' : 'Нет личных чатов'}
            </p>
            {!searchQuery && (
              <Button
                variant="link"
                onClick={() => setShowUserSearch(true)}
                className="mt-2 text-primary"
              >
                Начать новый чат
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            <AnimatePresence>
              {filteredConversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  onClick={() => onSelectConversation(conv.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* User search modal */}
      <UserSearchModal
        open={showUserSearch}
        onOpenChange={setShowUserSearch}
      />
    </div>
  );
}

function ConversationItem({ 
  conversation, 
  onClick 
}: { 
  conversation: PrivateConversation; 
  onClick: () => void;
}) {
  const name = conversation.other_user?.display_name || 'Пользователь';
  
  const timeAgo = conversation.last_message 
    ? formatDistanceToNow(new Date(conversation.last_message.created_at), { 
        addSuffix: false, 
        locale: ru 
      })
    : '';

  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left",
        conversation.unread_count && conversation.unread_count > 0 && "bg-primary/5"
      )}
    >
      <Avatar className="h-12 w-12">
        <AvatarImage src={conversation.other_user?.avatar_url || ''} />
        <AvatarFallback className="bg-gradient-to-br from-sky-100 to-blue-100 dark:from-sky-900 dark:to-blue-900 text-primary">
          {name[0].toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className={cn(
            "text-sm font-medium text-foreground truncate",
            conversation.unread_count && conversation.unread_count > 0 && "font-semibold"
          )}>
            {name}
          </p>
          {timeAgo && (
            <span className="text-xs text-muted-foreground ml-2 shrink-0">
              {timeAgo}
            </span>
          )}
        </div>
        <p className={cn(
          "text-sm truncate mt-0.5",
          conversation.unread_count && conversation.unread_count > 0 
            ? "text-foreground" 
            : "text-muted-foreground"
        )}>
          {conversation.last_message?.content || 'Нет сообщений'}
        </p>
      </div>

      {conversation.unread_count && conversation.unread_count > 0 && (
        <Badge 
          variant="default" 
          className="bg-primary/80 text-primary-foreground h-5 min-w-[20px] flex items-center justify-center rounded-full text-xs px-1.5"
        >
          {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
        </Badge>
      )}
    </motion.button>
  );
}
