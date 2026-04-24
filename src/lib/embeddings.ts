/**
 * Клиент для Jiva (память + чат).
 */

import { supabase } from '@/integrations/supabase/client';

export type MemorySourceType = 'chat' | 'insight' | 'ritual' | 'trigger' | 'win' | 'note';

export interface MemoryItem {
  content: string;
  source_type?: MemorySourceType;
  metadata?: Record<string, unknown>;
}

export interface MemoryResult {
  id: string;
  content: string;
  source_type: string | null;
  score: number;
  created_at: string;
}

export async function ingestMemories(items: MemoryItem[]): Promise<{ success: boolean; count: number }> {
  const { data, error } = await supabase.functions.invoke('jiva-embeddings-ingest', {
    body: { items },
  });
  if (error) throw new Error(error.message ?? 'Не удалось сохранить память');
  return data;
}

export async function searchMemories(query: string, k = 6): Promise<MemoryResult[]> {
  const { data, error } = await supabase.functions.invoke('jiva-embeddings-search', {
    body: { query, k },
  });
  if (error) throw new Error(error.message ?? 'Не удалось найти воспоминания');
  return (data?.results ?? []) as MemoryResult[];
}
