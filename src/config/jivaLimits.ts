/**
 * Лимиты Jiva. Должны совпадать с константами в supabase/functions/ai-chat/index.ts
 * (FREE_DEEP_TOTAL_LIMIT, FREE_FAST_DAILY_LIMIT, PREMIUM_DAILY_LIMIT)
 * и в supabase/functions/reply-to-jiva/index.ts (DAILY_LIMIT, FREE_TRIAL_LIMIT).
 */
export const JIVA_CHAT_LIMITS = {
  /** Free, Deep-фаза (новый юзер): всего сообщений на Deep за всё время */
  freeDeepTotalLimit: 10,
  /** Free, Fast-фаза: сообщений в сутки */
  freeFastDailyLimit: 5,
  /** Premium: глубоких сообщений в сутки */
  premiumDailyLimit: 30,
} as const;

export const JIVA_REPLY_LIMITS = {
  /** Premium: ответов Jiva в комментариях ленты в день */
  premiumDailyLimit: 3,
  /** Free: одноразовый бесплатный ответ Дживе (всего 1 на одном посте) */
  freeTrialLimit: 1,
} as const;
