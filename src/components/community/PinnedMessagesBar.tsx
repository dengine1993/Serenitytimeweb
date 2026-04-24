import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Pin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseMentions } from '@/hooks/useMentions';

interface PinnedMessage {
  id: string;
  message_id: string;
  pinned_at: string;
  message?: {
    id: string;
    content: string;
    user_id: string;
    author?: {
      display_name: string | null;
    };
  };
}

interface PinnedMessagesBarProps {
  isAdmin: boolean;
  onScrollToMessage?: (messageId: string) => void;
}

export function PinnedMessagesBar({ isAdmin, onScrollToMessage }: PinnedMessagesBarProps) {
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const loadPinnedMessages = async () => {
      const { data: pinnedData } = await supabase
        .from('pinned_community_messages')
        .select('id, message_id, pinned_at')
        .order('pinned_at', { ascending: false });

      if (pinnedData && pinnedData.length > 0) {
        // Fetch the actual messages
        const messageIds = pinnedData.map(p => p.message_id);
        const { data: messagesData } = await supabase
          .from('community_messages')
          .select('id, content, user_id')
          .in('id', messageIds);

        if (messagesData) {
          const userIds = [...new Set(messagesData.map(m => m.user_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, display_name')
            .in('user_id', userIds);

          const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
          const messageMap = new Map(messagesData.map(m => [m.id, { ...m, author: profileMap.get(m.user_id) }]));

          setPinnedMessages(pinnedData.map(p => ({
            ...p,
            message: messageMap.get(p.message_id)
          })));
        }
      }
    };

    loadPinnedMessages();

    // Subscribe to changes
    const channel = supabase
      .channel('pinned-messages')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pinned_community_messages'
      }, () => {
        loadPinnedMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const unpinMessage = async (id: string) => {
    await supabase
      .from('pinned_community_messages')
      .delete()
      .eq('id', id);
  };

  if (pinnedMessages.length === 0) return null;

  const currentPinned = pinnedMessages[currentIndex];
  if (!currentPinned?.message) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="bg-amber-50/80 dark:bg-amber-500/10 border-b border-amber-200/50 dark:border-amber-500/20"
    >
      <div className="px-4 py-2">
        <div className="flex items-center gap-2">
          <Pin className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          
          <button
            onClick={() => onScrollToMessage?.(currentPinned.message_id)}
            className="flex-1 min-w-0 text-left"
          >
            <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
              {currentPinned.message.author?.display_name || 'Аноним'}
              {pinnedMessages.length > 1 && (
                <span className="ml-2 text-amber-600/60 dark:text-amber-400/60">
                  ({currentIndex + 1}/{pinnedMessages.length})
                </span>
              )}
            </p>
            <p className="text-sm text-amber-800/80 dark:text-amber-200/80 truncate">
              {currentPinned.message.content}
            </p>
          </button>

          <div className="flex items-center gap-1 shrink-0">
            {pinnedMessages.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentIndex((currentIndex + 1) % pinnedMessages.length)}
                className="h-7 px-2 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20"
              >
                Далее
              </Button>
            )}
            
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => unpinMessage(currentPinned.id)}
                className="h-7 w-7 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
