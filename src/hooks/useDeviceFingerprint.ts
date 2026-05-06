import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * M5 — Device fingerprint.
 * При первом заходе авторизованного юзера в нативном приложении
 * получаем уникальный device_id (Capacitor) и сохраняем в profiles.device_id.
 * В вебе — no-op (нет надёжного API; обходить триал через web проще,
 * но это и так контролируется на сервере по user_id).
 *
 * Используется бэком для rate-limit регистраций с одного устройства
 * и защиты бесплатных лимитов от обхода через создание новых аккаунтов.
 */
export function useDeviceFingerprint() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !Capacitor.isNativePlatform()) return;

    let cancelled = false;
    (async () => {
      try {
        const { identifier } = await Device.getId();
        if (!identifier || cancelled) return;

        // Записываем только если ещё не записан или отличается
        const { data: profile } = await supabase
          .from('profiles')
          .select('device_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profile?.device_id === identifier) return;

        await supabase
          .from('profiles')
          .update({ device_id: identifier })
          .eq('user_id', user.id);
      } catch (e) {
        console.warn('[useDeviceFingerprint] failed', e);
      }
    })();

    return () => { cancelled = true; };
  }, [user]);
}
