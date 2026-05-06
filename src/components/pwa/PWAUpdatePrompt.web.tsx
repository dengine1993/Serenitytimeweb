import { useEffect, useCallback } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';

// Очистка всех кешей при критичном обновлении
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    console.log('Все кеши очищены:', cacheNames);
  } catch (error) {
    console.error('Ошибка очистки кешей:', error);
  }
}

export default function PWAUpdatePromptWeb() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW зарегистрирован:', r);
      if (r) {
        setInterval(() => r.update(), 5 * 60 * 1000);
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') r.update();
        });
        window.addEventListener('online', () => r.update());
      }
    },
    onRegisterError(error) {
      console.error('SW ошибка регистрации:', error);
    },
  });

  const handleUpdate = useCallback(async () => {
    toast.info('Обновление приложения...', { duration: 2000 });
    await clearAllCaches();
    updateServiceWorker(true);
  }, [updateServiceWorker]);

  useEffect(() => {
    if (needRefresh) handleUpdate();
  }, [needRefresh, handleUpdate]);

  return null;
}
