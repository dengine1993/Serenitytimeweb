// App constants
export const APP_NAME = "Восход";
export const WEEKLY_COOLDOWN_DAYS = 7;
export const CRISIS_HELPLINE = "051";

// Системные пользователи
export const CEO_USER_ID = 'fa59e071-0a6a-4cbe-855e-4ffd1f3915c9';
// Системный бот в ленте — Jiva (под капотом — модель x-ai/grok-4-fast)
export const JIVA_BOT_USER_ID = '00000000-0000-0000-0000-000000000001';

// Voice limits per tier
export const VOICE_LIMITS = {
  FREE_GREETING_SECONDS: 30,
  PLUS_MINUTES: 8,
  PREMIUM_MINUTES: 20
} as const;

// Цены берутся из app_config.product_catalog (см. usePricing) и
// supabase/functions/_shared/products.ts. Не дублируем здесь, чтобы избежать рассинхрона.
