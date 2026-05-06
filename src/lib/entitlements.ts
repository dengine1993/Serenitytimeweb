import { supabase } from '@/integrations/supabase/client';
import { addDays } from 'date-fns';

/**
 * Check if user has active Premium subscription.
 * Делегирует серверной функции is_premium, которая учитывает:
 *  - активную подписку в subscriptions
 *  - ручной грант через profiles.premium_until
 */
export async function isPremium(userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_premium', { p_user_id: userId });
  if (error) {
    console.error('[entitlements] is_premium rpc failed:', error);
    return false;
  }
  return data === true;
}

/**
 * Apply referral code
 */
export async function applyReferral(inviterCode: string, inviteeUserId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  // Find inviter by referral code from profiles
  // @ts-ignore - Avoiding deep type instantiation
  const { data: inviter } = await supabase
    .from('profiles')
    .select('id')
    .eq('referral_code', inviterCode)
    .maybeSingle();

  if (!inviter) {
    return { success: false, error: 'Реферальный код не найден' };
  }

  if (inviter.id === inviteeUserId) {
    return { success: false, error: 'Нельзя использовать свой реферальный код' };
  }

  // Check if invitee already used a code
  // @ts-ignore - Avoiding deep type instantiation
  const { data: existing } = await supabase
    .from('referrals_v2')
    .select('id')
    .eq('invited_user_id', inviteeUserId)
    .maybeSingle();

  if (existing) {
    return { success: false, error: 'Вы уже использовали реферальный код' };
  }

  // Create referral record
  const { error } = await supabase
    .from('referrals_v2')
    .insert({
      inviter_user_id: inviter.id,
      invited_user_id: inviteeUserId,
      code: inviterCode,
      inviter_reward_days: 7,
      invited_reward_days: 0
    });

  if (error) {
    return { success: false, error: 'Не удалось применить реферальный код' };
  }

  return { success: true };
}

/**
 * Grant referral rewards after invitee's first payment
 */
export async function grantReferralRewards(inviteeUserId: string): Promise<void> {
  const { data: referral } = await supabase
    .from('referrals_v2')
    .select('inviter_user_id, inviter_reward_days')
    .eq('invited_user_id', inviteeUserId)
    .maybeSingle();

  if (!referral) return;

  // Extend inviter's premium by N days
  const { data: inviterSub } = await supabase
    .from('subscriptions')
    .select('current_period_end')
    .eq('user_id', referral.inviter_user_id)
    .eq('plan', 'premium')
    .maybeSingle();

  if (inviterSub && inviterSub.current_period_end) {
    const newEnd = addDays(new Date(inviterSub.current_period_end), referral.inviter_reward_days);
    await supabase
      .from('subscriptions')
      .update({ current_period_end: newEnd.toISOString() })
      .eq('user_id', referral.inviter_user_id)
      .eq('plan', 'premium');
  }
}
