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
    name: 'Дыхание',
    nameEn: 'BREATH',
    tagline: 'Скорая помощь в моменте',
    features: {
      therapy: {
        weeklySessions: 1,
        extraSessionPriceRub: PRICES.EXTRA_SESSION_RUB,
        allowExtraSessionPurchase: true,
      },
      navigator: {
        dailyMessages: 0, // No access after trial
        modelTier: 'free',
      },
      artTherapy: {
        dailyAnalyses: 0, // Only drawing, no analysis
      },
      trial: {
        durationHours: 24,
        messages: 3,
        artAnalyses: 1,
      },
      memory: false,
      prioritySupport: false,
    },
  },

  premium: {
    id: 'premium',
    public: true,
    name: 'Опора',
    nameEn: 'ANCHOR',
    tagline: 'Глубокая работа с состоянием',
    monthlyPriceRub: PRICES.PREMIUM_RUB,
    features: {
      therapy: {
        weeklySessions: 2,
        extraSessionPriceRub: PRICES.EXTRA_SESSION_RUB,
        allowExtraSessionPurchase: true,
      },
      navigator: {
        dailyMessages: 10, // 10 messages per day
        modelTier: 'premium',
      },
      emergencyBuffer: {
        perDay: 5, // +5 messages when activated
        usesPerMonth: 3, // Can use 3 times per month
      },
      artTherapy: {
        dailyAnalyses: 3, // 3 analyses per day
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
