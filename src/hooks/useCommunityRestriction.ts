import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CommunityRestriction {
  isRestricted: boolean;
  restrictedUntil: Date | null;
  remainingTime: string | null;
  loading: boolean;
}

export function useCommunityRestriction(): CommunityRestriction {
  const { user } = useAuth();
  const [isRestricted, setIsRestricted] = useState(false);
  const [restrictedUntil, setRestrictedUntil] = useState<Date | null>(null);
  const [remainingTime, setRemainingTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRestriction = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('community_restricted_until, blocked_at')
        .eq('user_id', user.id)
        .single();

      if (data?.blocked_at) {
        // Permanently banned
        setIsRestricted(true);
        setRestrictedUntil(null);
        setRemainingTime('Аккаунт заблокирован');
      } else if (data?.community_restricted_until) {
        const until = new Date(data.community_restricted_until);
        const now = new Date();
        
        if (until > now) {
          setIsRestricted(true);
          setRestrictedUntil(until);
        } else {
          setIsRestricted(false);
          setRestrictedUntil(null);
        }
      } else {
        setIsRestricted(false);
        setRestrictedUntil(null);
      }
      
      setLoading(false);
    };

    checkRestriction();
  }, [user]);

  // Update remaining time every minute
  useEffect(() => {
    if (!restrictedUntil) {
      setRemainingTime(null);
      return;
    }

    const updateRemainingTime = () => {
      const now = new Date();
      const diff = restrictedUntil.getTime() - now.getTime();

      if (diff <= 0) {
        setIsRestricted(false);
        setRestrictedUntil(null);
        setRemainingTime(null);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        setRemainingTime(`${hours}ч ${minutes}м`);
      } else {
        setRemainingTime(`${minutes}м`);
      }
    };

    updateRemainingTime();
    const interval = setInterval(updateRemainingTime, 60000);

    return () => clearInterval(interval);
  }, [restrictedUntil]);

  return { isRestricted, restrictedUntil, remainingTime, loading };
}
