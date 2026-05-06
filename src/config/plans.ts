export type PlanId = 'free' | 'premium';

export interface PlanConfig {
  id: PlanId;
  public: boolean;
  name: string;                  // RU display name
  nameEn: string;                // EN display name
  tagline?: string;              // Short tagline
  monthlyPriceRub?: number;
  features: {
    therapy: {
      weeklySessions: number;
      extraSessionPriceRub: number;
      allowExtraSessionPurchase: boolean;
    };
    navigator: {
      dailyMessages: number;           // Daily message limit
      modelTier: 'free' | 'premium';
    };
    emergencyBuffer?: {
      perDay: number;                  // Extra messages when activated
      usesPerMonth: number;            // How many times can activate per month
    };
    artTherapy: {
      dailyAnalyses: number;           // 0 for free, 2 for premium
    };
    trial?: {
      durationHours: number;
      messages: number;
      artAnalyses: number;
    };
    memory: boolean;             // Chat memory persistence
    prioritySupport: boolean;
  };
}

export const FLAGS = {
  ENABLE_MICRO_PURCHASES: true,
  BILLING_PROVIDER: import.meta.env.VITE_BILLING_PROVIDER ?? 'yookassa',
};

const envRub = (key: string, fallback: number) => {
  const val = import.meta.env[key];
  return val ? Number(val) : fallback;
};

export const PRICES = {
  PREMIUM_RUB: envRub('VITE_PRICE_PREMIUM_RUB', 690),
  EXTRA_SESSION_RUB: envRub('VITE_PRICE_EXTRA_SESSION_RUB', 59),
};

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: 'free',
    public: true,
    name: 'Free',
    nameEn: 'Free',
    tagline: 'Быстрая поддержка в моменте',
    features: {
      therapy: {
        weeklySessions: 1,
        extraSessionPriceRub: PRICES.EXTRA_SESSION_RUB,
        allowExtraSessionPurchase: true,
      },
      navigator: {
        dailyMessages: 7, // Jiva Fast — 7 сообщений в сутки (после исчерпания Deep-ресурса).
        modelTier: 'free',
      },
      artTherapy: {
        dailyAnalyses: 0, // Только рисование, без анализа
      },
      // Free получает FREE_DEEP_TOTAL_LIMIT (=15) сообщений на Deep-модели за всё время,
      // потом автоматически переключается на Fast (10/сутки).
      // Источник правды — edge-функция ai-chat (FREE_DEEP_TOTAL_LIMIT, FREE_FAST_DAILY_LIMIT).
      trial: {
        durationHours: 0, // больше не используется — переход по счётчику сообщений, не по времени.
        messages: 15,
        artAnalyses: 1,
      },
      memory: false,
      prioritySupport: false,
    },
  },

  premium: {
    id: 'premium',
    public: true,
    name: 'Premium',
    nameEn: 'Premium',
    tagline: 'Jiva Deep — глубокая, помнит тебя',
    monthlyPriceRub: PRICES.PREMIUM_RUB,
    features: {
      therapy: {
        weeklySessions: 2,
        extraSessionPriceRub: PRICES.EXTRA_SESSION_RUB,
        allowExtraSessionPurchase: true,
      },
      navigator: {
        dailyMessages: 30, // 30 сообщений в день с Jiva Deep
        modelTier: 'premium',
      },
      emergencyBuffer: {
        perDay: 5,
        usesPerMonth: 3,
      },
      artTherapy: {
        dailyAnalyses: 3,
      },
      memory: true,
      prioritySupport: true,
    },
  },
};

export function getPlanConfig(planId: PlanId): PlanConfig {
  return PLANS[planId];
}

export function getPublicPlans(): PlanConfig[] {
  return Object.values(PLANS).filter(p => p.public);
}
