import { supabase } from '@/integrations/supabase/client';
import { addDays } from 'date-fns';

/**
 * Check if user has active Premium subscription
 */
export async function isPremium(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('user_id', userId)
    .eq('plan', 'premium')
    .single();

  if (error || !data) return false;

  return data.status === 'active' && new Date(data.current_period_end) > new Date();
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
    .single();

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
    .single();

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
    .single();

  if (!referral) return;

  // Extend inviter's premium by N days
  const { data: inviterSub } = await supabase
    .from('subscriptions')
    .select('current_period_end')
    .eq('user_id', referral.inviter_user_id)
    .eq('plan', 'premium')
    .single();

  if (inviterSub && inviterSub.current_period_end) {
    const newEnd = addDays(new Date(inviterSub.current_period_end), referral.inviter_reward_days);
    await supabase
      .from('subscriptions')
      .update({ current_period_end: newEnd.toISOString() })
      .eq('user_id', referral.inviter_user_id)
      .eq('plan', 'premium');
  }
}
