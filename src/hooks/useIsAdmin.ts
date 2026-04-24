import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const CACHE_KEY_PREFIX = 'isAdmin:';

function readCache(userId: string): boolean | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY_PREFIX + userId);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return null;
  } catch {
    return null;
  }
}

function writeCache(userId: string, value: boolean) {
  try {
    sessionStorage.setItem(CACHE_KEY_PREFIX + userId, value ? 'true' : 'false');
  } catch {
    /* ignore */
  }
}

export function useIsAdmin() {
  const { user } = useAuth();

  // Optimistic init from cache to prevent flicker on reload
  const cached = user ? readCache(user.id) : null;
  const [isAdmin, setIsAdmin] = useState<boolean>(cached ?? false);
  const [loading, setLoading] = useState<boolean>(cached === null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const cachedValue = readCache(user.id);
      if (cachedValue !== null) {
        setIsAdmin(cachedValue);
        setLoading(false);
      } else {
        setLoading(true);
      }

      try {
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin',
        });

        if (cancelled) return;

        if (error) {
          console.error('[useIsAdmin] has_role error:', error);
          // Keep cached value on transient error; only force-false if no cache
          if (cachedValue === null) setIsAdmin(false);
        } else {
          const result = !!data;
          setIsAdmin(result);
          writeCache(user.id, result);
        }
      } catch (error) {
        console.error('Error checking admin role:', error);
        if (!cancelled && cachedValue === null) setIsAdmin(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { isAdmin, loading };
}
