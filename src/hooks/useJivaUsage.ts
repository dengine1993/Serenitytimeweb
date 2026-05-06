import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePremiumStatus } from '@/hooks/useEntitlements';

/**
 * Лимиты Дживы (зеркалят supabase/functions/ai-chat/index.ts):
 * - Free Fast: 5/сутки (FREE_FAST_DAILY_LIMIT)
 * - Premium Deep: 30/сутки (PREMIUM_DAILY_LIMIT)
 *
 * Считаем user-сообщения за календарные сутки в локальной таймзоне.
 * Для бейджа на главной — этого достаточно; точный gate всё равно
 * на бэкенде в edge-функции.
 */
const FREE_FAST_DAILY_LIMIT = 5;
const PREMIUM_DAILY_LIMIT = 30;

export interface JivaUsage {
  used: number;
  limit: number;
  left: number;
  isPremium: boolean;
  isLoading: boolean;
}

export function useJivaUsage(): JivaUsage {
  const { user } = useAuth();
  const { isPremium } = usePremiumStatus();

  const limit = isPremium ? PREMIUM_DAILY_LIMIT : FREE_FAST_DAILY_LIMIT;

  const { data: used = 0, isLoading } = useQuery({
    queryKey: ['jiva-usage-today', user?.id],
    enabled: !!user,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!user) return 0;
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from('ai_messages')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('role', 'user')
        .gte('created_at', startOfDay.toISOString());
      return count ?? 0;
    },
  });

  return {
    used,
    limit,
    left: Math.max(0, limit - used),
    isPremium,
    isLoading,
  };
}
