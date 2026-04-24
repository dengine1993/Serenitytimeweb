// =============================================
// Plan Limits Configuration v2.4.1
// =============================================

// Art Therapy лимиты
export const ART_THERAPY_LIMITS = {
  free: {
    dailyAnalyses: 0, // Only drawing, no analysis
  },
  premium: {
    dailyAnalyses: 3, // 3 analyses per day
  },
} as const;

// Diary лимиты (v2.4.2)
export const DIARY_LIMITS = {
  free: {
    calendarDays: 14,
    smerArchiveDays: 14,
    smerAiAnalysis: false,
  },
  premium: {
    calendarDays: -1,
    smerArchiveDays: -1,
    smerAiAnalysis: true,
  },
} as const;

// Internal plan metadata and limits (legacy compatibility)
export const PLAN_LIMITS = {
  free: {
    weeklyTextSession: true,
    hasArchive: false,
    hasAllRituals: false,
    model: 'jiva-base'
  },
  premium: {
    extraSessionPrice: 79,
    weeklyTextSession: true,
    hasArchive: true,
    hasAllRituals: true
  }
} as const;

export type PlanTier = keyof typeof PLAN_LIMITS;

export const getPlanLimits = (tier: string) => {
  return PLAN_LIMITS[tier as PlanTier] || PLAN_LIMITS.free;
};

// Safety guardrails
export const SAFETY_KEYWORDS = [
  'суицид', 'убить себя', 'покончить с собой', 'не хочу жить',
  'причинить вред', 'самоповреждение', 'порезать себя'
];

export const containsSafetyFlag = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  return SAFETY_KEYWORDS.some(keyword => lowerText.includes(keyword));
};

// Respect user boundaries
export interface UserBoundaries {
  topicsToAvoid: string[];
  quietHoursStart?: string;
  quietHoursEnd?: string;
  reminderFrequency?: string;
}

export const isWithinQuietHours = (boundaries: UserBoundaries): boolean => {
  if (!boundaries.quietHoursStart || !boundaries.quietHoursEnd) return false;

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const [startHour, startMin] = boundaries.quietHoursStart.split(':').map(Number);
  const [endHour, endMin] = boundaries.quietHoursEnd.split(':').map(Number);

  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;

  if (startTime <= endTime) {
    return currentTime >= startTime && currentTime <= endTime;
  } else {
    return currentTime >= startTime || currentTime <= endTime;
  }
};

export const shouldAvoidTopic = (text: string, boundaries: UserBoundaries): boolean => {
  const lowerText = text.toLowerCase();
  return boundaries.topicsToAvoid.some(topic =>
    lowerText.includes(topic.toLowerCase())
  );
};
