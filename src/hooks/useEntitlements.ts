import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { isPremium } from '@/lib/entitlements';

export function usePremiumStatus() {
  const { user } = useAuth();

  const { data: isPremiumResult = false, isLoading } = useQuery({
    queryKey: ['premium-status', user?.id],
    queryFn: () => isPremium(user!.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return { isPremium: isPremiumResult, loading: isLoading };
}

export function useInvalidatePremiumStatus() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ['premium-status', user?.id] });
  };
}
