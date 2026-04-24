import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PrivateChatList } from './PrivateChatList';
import { PrivateChatScreen } from './PrivateChatScreen';

interface PrivateChatsTabProps {
  initialConversationId?: string | null;
  onConversationOpened?: () => void;
}

export function PrivateChatsTab({ initialConversationId, onConversationOpened }: PrivateChatsTabProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  // Open conversation when initialConversationId is passed
  useEffect(() => {
    if (initialConversationId) {
      setSelectedConversationId(initialConversationId);
      onConversationOpened?.();
    }
  }, [initialConversationId, onConversationOpened]);

  return (
    <div className="h-full flex flex-col min-h-0">
      <AnimatePresence mode="wait">
        {selectedConversationId ? (
          <motion.div
            key="chat"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            <PrivateChatScreen
              conversationId={selectedConversationId}
              onBack={() => setSelectedConversationId(null)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            <PrivateChatList
              onSelectConversation={setSelectedConversationId}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
