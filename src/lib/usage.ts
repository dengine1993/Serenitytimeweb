import { supabase } from "@/integrations/supabase/client";
import { getPlanConfig, type PlanId } from "@/config/plans";

export interface UsageCounter {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  navigator_messages_day: number;
  jiva_sessions_week: number; // Keep DB column name for compatibility
  jiva_extra_sessions_purchased: number; // Keep DB column name for compatibility
  created_at: string;
  updated_at: string;
}

// Alias for cleaner code
type TherapySessionsWeek = UsageCounter['jiva_sessions_week'];
type ExtraSessionsPurchased = UsageCounter['jiva_extra_sessions_purchased'];

export async function getCurrentUsage(userId: string): Promise<UsageCounter | null> {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay()); // Start of week
  
  const { data, error } = await supabase
    .from('usage_counters')
    .select('*')
    .eq('user_id', userId)
    .gte('period_end', today.toISOString())
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching usage:', error);
  }

  return data;
}

export async function canUseNavigator(userId: string, planId: PlanId): Promise<boolean> {
  const plan = getPlanConfig(planId);
  const usage = await getCurrentUsage(userId);
  
  if (!usage) return true; // First use
  
  const dailyLimit = plan.features.navigator.dailyMessages;
  if (dailyLimit === 9999) return true; // Premium unlimited
  
  return usage.navigator_messages_day < dailyLimit;
}

export async function canStartTherapySession(
  userId: string, 
  planId: PlanId,
  isExtraSession: boolean = false
): Promise<{ allowed: boolean; reason?: string }> {
  const plan = getPlanConfig(planId);
  const usage = await getCurrentUsage(userId);
  
  if (!usage) {
    return { allowed: true }; // First session
  }

  // Check weekly quota
  const weeklyLimit = plan.features.therapy.weeklySessions;
  const sessionsUsed = usage.jiva_sessions_week; // DB column name
  
  if (isExtraSession) {
    // Extra sessions are paid, always allowed if feature enabled
    return { 
      allowed: plan.features.therapy.allowExtraSessionPurchase,
      reason: plan.features.therapy.allowExtraSessionPurchase ? undefined : 'errors.extraSessionsDisabled'
    };
  }

  // Check if can use extra purchased session
  if (sessionsUsed >= weeklyLimit && usage.jiva_extra_sessions_purchased > 0) {
    return { allowed: true };
  }

  if (sessionsUsed >= weeklyLimit) {
    return { 
      allowed: false, 
      reason: 'errors.weeklyLimitReached' 
    };
  }

  return { allowed: true };
}

export async function registerNavigatorUsage(userId: string): Promise<void> {
  const usage = await getCurrentUsage(userId);
  
  if (!usage) {
    // Create new counter
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    await supabase.from('usage_counters').insert({
      user_id: userId,
      period_start: today.toISOString(),
      period_end: tomorrow.toISOString(),
      navigator_messages_day: 1,
      jiva_sessions_week: 0,
      jiva_extra_sessions_purchased: 0,
    });
  } else {
    await supabase
      .from('usage_counters')
      .update({ 
        navigator_messages_day: usage.navigator_messages_day + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', usage.id);
  }
}

export async function registerTherapySession(
  userId: string,
  isExtra: boolean = false
): Promise<void> {
  const usage = await getCurrentUsage(userId);
  
  if (!usage) {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    await supabase.from('usage_counters').insert({
      user_id: userId,
      period_start: today.toISOString(),
      period_end: nextWeek.toISOString(),
      navigator_messages_day: 0,
      jiva_sessions_week: isExtra ? 0 : 1,
      jiva_extra_sessions_purchased: isExtra ? -1 : 0,
    });
  } else {
    const updates: Partial<UsageCounter> = {
      updated_at: new Date().toISOString()
    };
    
    if (isExtra && usage.jiva_extra_sessions_purchased > 0) {
      updates.jiva_extra_sessions_purchased = usage.jiva_extra_sessions_purchased - 1;
    } else {
      updates.jiva_sessions_week = usage.jiva_sessions_week + 1;
    }
    
    await supabase
      .from('usage_counters')
      .update(updates)
      .eq('id', usage.id);
  }
}

export async function addExtraSession(userId: string): Promise<void> {
  const usage = await getCurrentUsage(userId);
  
  if (!usage) {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    await supabase.from('usage_counters').insert({
      user_id: userId,
      period_start: today.toISOString(),
      period_end: nextWeek.toISOString(),
      navigator_messages_day: 0,
      jiva_sessions_week: 0,
      jiva_extra_sessions_purchased: 1,
    });
  } else {
    await supabase
      .from('usage_counters')
      .update({ 
        jiva_extra_sessions_purchased: usage.jiva_extra_sessions_purchased + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', usage.id);
  }
}
