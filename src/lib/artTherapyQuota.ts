import { supabase } from '@/integrations/supabase/client';
import { ART_THERAPY_LIMITS } from '@/lib/planLimits';

interface QuotaResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  isPremium: boolean;
  periodType: 'daily' | 'lifetime' | 'none';
}

const FREE_LIFETIME_LIMIT = 1;

/**
 * Check if user can analyze their drawing
 * Free = 1 analysis lifetime (counted via art_therapy_sessions)
 * Premium = 3/day
 */
export async function canAnalyzeArt(userId: string): Promise<QuotaResult> {
  const { data: isPremiumResult } = await supabase.rpc('is_premium', { p_user_id: userId });
  const isPremiumUser = isPremiumResult === true;

  if (isPremiumUser) {
    const dailyLimit = ART_THERAPY_LIMITS.premium.dailyAnalyses;
    const today = new Date().toISOString().split('T')[0];

    const { data: counter } = await supabase
      .from('usage_counters')
      .select('id, art_analyses_month, art_analyses_month_reset')
      .eq('user_id', userId)
      .maybeSingle();

    if (!counter) {
      return { allowed: true, remaining: dailyLimit, limit: dailyLimit, isPremium: true, periodType: 'daily' };
    }

    const needsReset = !counter.art_analyses_month_reset || counter.art_analyses_month_reset < today;
    if (needsReset) {
      await supabase
        .from('usage_counters')
        .update({ art_analyses_month: 0, art_analyses_month_reset: today })
        .eq('id', counter.id);
      return { allowed: true, remaining: dailyLimit, limit: dailyLimit, isPremium: true, periodType: 'daily' };
    }

    const used = counter.art_analyses_month || 0;
    const remaining = Math.max(0, dailyLimit - used);
    return { allowed: remaining > 0, remaining, limit: dailyLimit, isPremium: true, periodType: 'daily' };
  }

  // Free user: count user_art_therapy_entries (actual saved analyses)
  const { count, error } = await supabase
    .from('user_art_therapy_entries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  const used = error ? 0 : (count ?? 0);
  const remaining = Math.max(0, FREE_LIFETIME_LIMIT - used);

  return {
    allowed: remaining > 0,
    remaining,
    limit: FREE_LIFETIME_LIMIT,
    isPremium: false,
    periodType: 'lifetime'
  };
}

/**
 * Increment the art analysis counter after successful analysis
 * (kept for backward compat but server is source of truth now)
 */
export async function trackArtAnalysis(userId: string): Promise<void> {
  // No-op: server-side tracking is the source of truth
}

export const FREE_ART_ANALYSES_LIMIT = FREE_LIFETIME_LIMIT;
export const PREMIUM_ART_ANALYSES_LIMIT = ART_THERAPY_LIMITS.premium.dailyAnalyses;
