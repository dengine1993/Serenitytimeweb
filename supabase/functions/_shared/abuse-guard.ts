// Fair use limits as defined in the offer (п. 5.4)
export const LIMITS = {
  ai_chat: {
    daily: 50,
    monthly: 300,
  },
  art_analysis: {
    daily: 5,
    monthly: 30,
  },
} as const;

export type FeatureType = keyof typeof LIMITS;

export interface LimitCheckResult {
  allowed: boolean;
  reason?: 'daily_limit' | 'monthly_limit' | 'feature_banned';
  message?: string;
  dailyCount?: number;
  monthlyCount?: number;
  dailyRemaining?: number;
  monthlyRemaining?: number;
}

/**
 * Check if user can use a feature based on fair use limits
 */
export async function checkFeatureLimit(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  feature: FeatureType
): Promise<LimitCheckResult> {
  const limits = LIMITS[feature];

  try {
    const { data, error } = await supabase.rpc('check_feature_limit', {
      p_user_id: userId,
      p_feature: feature,
      p_daily_limit: limits.daily,
      p_monthly_limit: limits.monthly,
    });

    if (error) {
      console.error(`Error checking ${feature} limit:`, error);
      // Fail open - allow the request if we can't check
      return { allowed: true };
    }

    return data as LimitCheckResult;
  } catch (err) {
    console.error(`Exception checking ${feature} limit:`, err);
    return { allowed: true };
  }
}

/**
 * Increment usage counter after successful request
 */
export async function incrementUsage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  feature: FeatureType
): Promise<{ success: boolean; dailyCount?: number; monthlyCount?: number }> {
  const limits = LIMITS[feature];

  try {
    const { data, error } = await supabase.rpc('increment_feature_usage', {
      p_user_id: userId,
      p_feature: feature,
      p_daily_limit: limits.daily,
      p_monthly_limit: limits.monthly,
    });

    if (error) {
      console.error(`Error incrementing ${feature} usage:`, error);
      return { success: false };
    }

    return data as { success: boolean; dailyCount?: number; monthlyCount?: number };
  } catch (err) {
    console.error(`Exception incrementing ${feature} usage:`, err);
    return { success: false };
  }
}

/**
 * Create a rate limit error response
 */
export function rateLimitResponse(result: LimitCheckResult): Response {
  const message = result.message || 'Превышен лимит разумного использования. Подробности в оферте (п. 5.4).';
  
  return new Response(
    JSON.stringify({
      error: 'rate_limit_exceeded',
      reason: result.reason,
      message,
      dailyCount: result.dailyCount,
      monthlyCount: result.monthlyCount,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Retry-After': result.reason === 'daily_limit' ? '86400' : '2592000', // 1 day or 30 days
      },
    }
  );
}

/**
 * Log abuse warning to admin logs
 */
export async function logAbuseWarning(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  feature: FeatureType,
  details: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from('admin_logs').insert({
      admin_id: userId,
      action: 'abuse_warning',
      target_type: 'user',
      target_id: userId,
      details: {
        feature,
        ...details,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Error logging abuse warning:', err);
  }
}
