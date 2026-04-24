import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ReadReceipt {
  message_id: string;
  user_id: string;
  read_at: string;
}

export function useMessageReadReceipts(messageIds: string[]) {
  const { user } = useAuth();
  const [readReceipts, setReadReceipts] = useState<Map<string, ReadReceipt[]>>(new Map());
  const markedAsRead = useRef<Set<string>>(new Set());

  // Load read receipts for messages
  useEffect(() => {
    if (messageIds.length === 0) return;

    const loadReceipts = async () => {
      const { data } = await supabase
        .from('message_read_receipts')
        .select('message_id, user_id, read_at')
        .in('message_id', messageIds);

      if (data) {
        const receiptsMap = new Map<string, ReadReceipt[]>();
        data.forEach((receipt) => {
          const existing = receiptsMap.get(receipt.message_id) || [];
          existing.push(receipt);
          receiptsMap.set(receipt.message_id, existing);
        });
        setReadReceipts(receiptsMap);
      }
    };

    loadReceipts();

    // Subscribe to new read receipts
    const channel = supabase
      .channel('read-receipts-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'message_read_receipts'
      }, (payload) => {
        const newReceipt = payload.new as ReadReceipt;
        if (messageIds.includes(newReceipt.message_id)) {
          setReadReceipts(prev => {
            const updated = new Map(prev);
            const existing = updated.get(newReceipt.message_id) || [];
            // Avoid duplicates
            if (!existing.some(r => r.user_id === newReceipt.user_id)) {
              updated.set(newReceipt.message_id, [...existing, newReceipt]);
            }
            return updated;
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageIds.join(',')]);

  // Mark a message as read
  const markAsRead = useCallback(async (messageId: string) => {
    if (!user || markedAsRead.current.has(messageId)) return;
    
    markedAsRead.current.add(messageId);

    // Optimistic update
    setReadReceipts(prev => {
      const updated = new Map(prev);
      const existing = updated.get(messageId) || [];
      if (!existing.some(r => r.user_id === user.id)) {
        updated.set(messageId, [...existing, {
          message_id: messageId,
          user_id: user.id,
          read_at: new Date().toISOString()
        }]);
      }
      return updated;
    });

    await supabase
      .from('message_read_receipts')
      .upsert({
        message_id: messageId,
        user_id: user.id
      }, {
        onConflict: 'message_id,user_id'
      });
  }, [user]);

  // Check if message was read by anyone (excluding author)
  const getReadCount = useCallback((messageId: string, authorId: string) => {
    const receipts = readReceipts.get(messageId) || [];
    return receipts.filter(r => r.user_id !== authorId).length;
  }, [readReceipts]);

  // Check if current user read a message
  const hasRead = useCallback((messageId: string) => {
    if (!user) return false;
    const receipts = readReceipts.get(messageId) || [];
    return receipts.some(r => r.user_id === user.id);
  }, [user, readReceipts]);

  return {
    readReceipts,
    markAsRead,
    getReadCount,
    hasRead
  };
}
