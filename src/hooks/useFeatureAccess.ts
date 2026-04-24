import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FeatureAccess {
  // Free features - always available
  canUseFeed: boolean;
  canUseNavigator: boolean;
  canUseCrisis: boolean;
  canUseDiary: boolean;
  canUsePrivateChats: boolean;

  // Freemium features (available to all, with limits for free users)
  canUseArtTherapy: boolean;

  // Status
  isPremium: boolean;
  isLoading: boolean;
}

async function checkPremiumStatus(userId: string): Promise<boolean> {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('user_id', userId)
    .eq('plan', 'premium')
    .single();

  if (subscription?.status === 'active' && subscription.current_period_end) {
    return new Date(subscription.current_period_end) > new Date();
  }

  return false;
}

export function useFeatureAccess(): FeatureAccess {
  const { user } = useAuth();

  const { data: isPremium = false, isLoading } = useQuery({
    queryKey: ['premium-status', user?.id],
    queryFn: () => checkPremiumStatus(user!.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    canUseFeed: true,
    canUseNavigator: true,
    canUseCrisis: true,
    canUseDiary: true,
    canUsePrivateChats: true,
    canUseArtTherapy: true,
    isPremium,
    isLoading,
  };
}
