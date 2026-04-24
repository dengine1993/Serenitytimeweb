import { useEffect, useCallback } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';

// Очистка всех кешей при критичном обновлении
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    console.log('Все кеши очищены:', cacheNames);
  } catch (error) {
    console.error('Ошибка очистки кешей:', error);
  }
}

export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW зарегистрирован:', r);
      if (r) {
        // Проверяем обновления каждые 5 минут
        setInterval(() => r.update(), 5 * 60 * 1000);
        
        // Проверяем при возвращении в приложение
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            r.update();
          }
        });
        
        // Проверяем при восстановлении сети
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
    if (needRefresh) {
      handleUpdate();
    }
  }, [needRefresh, handleUpdate]);

  return null;
}
