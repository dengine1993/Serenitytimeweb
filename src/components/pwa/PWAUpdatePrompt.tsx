import { lazy, Suspense, useEffect } from 'react';
import { isNativePlatform } from '@/lib/platform';

/**
 * Один репозиторий → две сборки:
 *   - `vite build`               → web (Timeweb), PWA включён.
 *   - `vite build --mode capacitor` → native, PWA-плагин выключен в vite.config.
 *
 * `import.meta.env.MODE` подставляется на этапе бандлинга, так что в Capacitor-
 * сборке Rollup tree-shake'ает ветку с `virtual:pwa-register/react` и
 * виртуальный модуль не запрашивается.
 */
const isCapacitorBuild = import.meta.env.MODE === 'capacitor';

const PWAUpdatePromptWeb = isCapacitorBuild
  ? null
  : lazy(() => import('./PWAUpdatePrompt.web'));

export function PWAUpdatePrompt() {
  const native = isNativePlatform();

  useEffect(() => {
    if (!native) return;
    // Снести любые ранее зарегистрированные SW + кэши в нативке
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
    }
    if ('caches' in window) {
      caches.keys().then((names) => names.forEach((n) => caches.delete(n)));
    }
  }, [native]);

  if (native || isCapacitorBuild || !PWAUpdatePromptWeb) return null;
  return (
    <Suspense fallback={null}>
      <PWAUpdatePromptWeb />
    </Suspense>
  );
}
