import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Регистрирует устройство в FCM/APNs и сохраняет токен в device_push_tokens.
 * Активируется только в нативном Capacitor-приложении и только для авторизованного юзера.
 */
export function usePushNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user?.id) return;

    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');

        const perm = await PushNotifications.checkPermissions();
        let status = perm.receive;
        if (status === 'prompt' || status === 'prompt-with-rationale') {
          const req = await PushNotifications.requestPermissions();
          status = req.receive;
        }
        if (status !== 'granted') return;

        await PushNotifications.register();

        const regHandle = await PushNotifications.addListener('registration', async ({ value }) => {
          const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';
          await supabase.from('device_push_tokens').upsert(
            {
              user_id: user.id,
              token: value,
              platform,
              last_seen_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,token' }
          );
        });

        const errHandle = await PushNotifications.addListener('registrationError', (err) => {
          console.error('[push] registration error', err);
        });

        const tapHandle = await PushNotifications.addListener(
          'pushNotificationActionPerformed',
          ({ notification }) => {
            const path = (notification.data as { path?: string } | undefined)?.path;
            if (path && typeof path === 'string' && path.startsWith('/')) {
              navigate(path);
            }
          }
        );

        cleanup = () => {
          regHandle.remove();
          errHandle.remove();
          tapHandle.remove();
        };
      } catch (e) {
        console.error('[push] init failed', e);
      }
    })();

    return () => cleanup?.();
  }, [user?.id, navigate]);
}
