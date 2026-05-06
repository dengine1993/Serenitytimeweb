import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const CACHE_KEY_PREFIX = 'isAdmin:';
const TTL_MS = 60_000; // 60 sec — invalidate stale role grants quickly

interface CacheEntry {
  v: boolean;
  t: number;
}

function readCache(userId: string): boolean | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY_PREFIX + userId);
    if (!raw) return null;
    // Backwards-compatible: legacy "true"/"false"
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (typeof parsed?.v !== 'boolean' || typeof parsed?.t !== 'number') return null;
    if (Date.now() - parsed.t > TTL_MS) return null;
    return parsed.v;
  } catch {
    return null;
  }
}

function writeCache(userId: string, value: boolean) {
  try {
    sessionStorage.setItem(
      CACHE_KEY_PREFIX + userId,
      JSON.stringify({ v: value, t: Date.now() } satisfies CacheEntry),
    );
  } catch {
    /* ignore */
  }
}

function clearAllAdminCache() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(CACHE_KEY_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

// Invalidate cache on auth state changes (logout/login).
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
    clearAllAdminCache();
  }
});

export function useIsAdmin() {
  const { user } = useAuth();

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
