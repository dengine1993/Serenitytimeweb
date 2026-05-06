import { usePremiumStatus } from '@/hooks/useEntitlements';

/**
 * Тонкая обёртка над usePremiumStatus.
 *
 * Раньше тут был дублирующий запрос в `subscriptions` напрямую — он игнорировал
 * ручной грант через `profiles.premium_until`, поэтому юзер с админ-грантом
 * не получал премиум-меток в `MoreDrawer` и других местах. Теперь делегируем
 * в `usePremiumStatus` (RPC `is_premium`), который учитывает оба источника.
 *
 * Раньше хук возвращал набор `canUse*` флагов, но они всегда были `true`
 * (реальные ограничения проверяются на бэкенде в edge-функциях). Поля
 * удалены — никто их не читал, кроме самого хука.
 */
export interface FeatureAccess {
  isPremium: boolean;
  isLoading: boolean;
}

export function useFeatureAccess(): FeatureAccess {
  const { isPremium, loading } = usePremiumStatus();

  return {
    isPremium,
    isLoading: loading,
  };
}
