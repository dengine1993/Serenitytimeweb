// Stub для virtual:pwa-register/react в Capacitor-сборке.
// Подменяется через resolve.alias в vite.config.ts при mode === "capacitor".
export function useRegisterSW() {
  return {
    needRefresh: [false, () => {}] as [boolean, (v: boolean) => void],
    offlineReady: [false, () => {}] as [boolean, (v: boolean) => void],
    updateServiceWorker: (_reload?: boolean) => Promise.resolve(),
  };
}
