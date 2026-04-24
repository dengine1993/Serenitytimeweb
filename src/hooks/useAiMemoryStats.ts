import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useAiMemoryStats() {
  const { user } = useAuth();
  const [count, setCount] = useState<number>(0);
  const [enabled, setEnabled] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [{ count: c }, { data: prof }] = await Promise.all([
        supabase
          .from('jiva_memory_chunks')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('profiles')
          .select('ai_memory_enabled')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);
      setCount(c ?? 0);
      setEnabled(prof?.ai_memory_enabled !== false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setMemoryEnabled = useCallback(
    async (next: boolean) => {
      if (!user) return;
      setEnabled(next);
      const { error } = await supabase
        .from('profiles')
        .update({ ai_memory_enabled: next })
        .eq('user_id', user.id);
      if (error) {
        setEnabled(!next);
        throw error;
      }
    },
    [user],
  );

  const clearMemory = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('clear-ai-memory', {
      body: {},
    });
    if (error) throw error;
    setCount(0);
    return (data as { deleted?: number })?.deleted ?? 0;
  }, []);

  return { count, enabled, loading, refresh, setMemoryEnabled, clearMemory };
}
