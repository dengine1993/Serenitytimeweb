import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { canAnalyzeArt, FREE_ART_ANALYSES_LIMIT } from '@/lib/artTherapyQuota';
import { ART_THERAPY_LIMITS } from '@/lib/planLimits';

export interface ArtTherapyQuota {
  allowed: boolean;
  remaining: number;
  limit: number;
  isPremium: boolean;
  periodType: 'daily' | 'lifetime' | 'none';
  isLoading: boolean;
  refresh: () => void;
}

export function useArtTherapyQuota(): ArtTherapyQuota {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['art-therapy-quota', user?.id],
    queryFn: () => canAnalyzeArt(user!.id),
    enabled: !!user?.id,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['art-therapy-quota', user?.id] });
  };

  const isPremium = data?.isPremium ?? false;
  const defaultLimit = isPremium 
    ? ART_THERAPY_LIMITS.premium.dailyAnalyses 
    : FREE_ART_ANALYSES_LIMIT;

  return {
    allowed: data?.allowed ?? false,
    remaining: data?.remaining ?? 0,
    limit: data?.limit ?? defaultLimit,
    isPremium,
    periodType: data?.periodType ?? 'none',
    isLoading,
    refresh
  };
}
