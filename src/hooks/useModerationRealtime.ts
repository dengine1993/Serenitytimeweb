// Reports system removed — this hook is now a no-op kept for compatibility.

export function useModerationRealtime(_options?: unknown) {
  return { isSubscribed: false, newReportsCount: 0, resetCount: () => {} };
}
