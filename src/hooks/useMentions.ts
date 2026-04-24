import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  user_id: string;
  display_name: string | null;
  username: string | null;
}

export function useMentions(inputValue: string, cursorPosition: number) {
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1);

  // Detect @mention in input
  useEffect(() => {
    const textBeforeCursor = inputValue.slice(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setMentionStartIndex(textBeforeCursor.lastIndexOf('@'));
    } else {
      setMentionQuery(null);
      setMentionStartIndex(-1);
      setSuggestions([]);
    }
  }, [inputValue, cursorPosition]);

  // Search for users
  useEffect(() => {
    if (mentionQuery === null) return;

    const searchUsers = async () => {
      setIsLoading(true);

      let query = supabase
        .from('profiles')
        .select('user_id, display_name, username')
        .limit(5);

      if (mentionQuery) {
        query = query.or(`display_name.ilike.%${mentionQuery}%,username.ilike.%${mentionQuery}%`);
      }

      const { data } = await query;
      setSuggestions(data || []);
      setIsLoading(false);
    };

    const debounceTimer = setTimeout(searchUsers, 200);
    return () => clearTimeout(debounceTimer);
  }, [mentionQuery]);

  const insertMention = useCallback((profile: Profile): string => {
    if (mentionStartIndex === -1) return inputValue;

    const displayName = profile.display_name || profile.username || 'Аноним';
    const beforeMention = inputValue.slice(0, mentionStartIndex);
    const afterMention = inputValue.slice(cursorPosition);
    
    return `${beforeMention}@${displayName} ${afterMention}`;
  }, [inputValue, mentionStartIndex, cursorPosition]);

  const closeSuggestions = useCallback(() => {
    setSuggestions([]);
    setMentionQuery(null);
  }, []);

  return {
    suggestions,
    isLoading,
    isOpen: mentionQuery !== null && suggestions.length > 0,
    insertMention,
    closeSuggestions
  };
}

// Helper to parse and highlight mentions in text
export function parseMentions(text: string): { type: 'text' | 'mention'; content: string }[] {
  const mentionRegex = /@(\S+)/g;
  const parts: { type: 'text' | 'mention'; content: string }[] = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'mention', content: match[0] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: 'text', content: text }];
}
