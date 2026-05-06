/**
 * Cookie consent management — клиентский источник истины.
 * Хранит выбор пользователя по категориям cookies в localStorage.
 * При обновлении версии — переспрашиваем согласие.
 */

export type CookieCategory = 'necessary' | 'functional' | 'analytics';

export interface CookieConsent {
  necessary: true; // всегда true — без них сервис не работает
  functional: boolean;
  analytics: boolean;
  timestamp: string; // ISO
  version: string;
}

const STORAGE_KEY = 'cookie_consent_v1';
export const CONSENT_VERSION = '1';

const DEFAULT_REJECTED: CookieConsent = {
  necessary: true,
  functional: false,
  analytics: false,
  timestamp: '',
  version: CONSENT_VERSION,
};

type Listener = (consent: CookieConsent | null) => void;
const listeners = new Set<Listener>();

function emit(consent: CookieConsent | null) {
  listeners.forEach((cb) => {
    try { cb(consent); } catch { /* noop */ }
  });
}

export function getConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsent;
    if (parsed.version !== CONSENT_VERSION) return null;
    return { ...parsed, necessary: true };
  } catch {
    return null;
  }
}

export function hasDecision(): boolean {
  return getConsent() !== null;
}

export function saveConsent(partial: { functional: boolean; analytics: boolean }): CookieConsent {
  const consent: CookieConsent = {
    necessary: true,
    functional: partial.functional,
    analytics: partial.analytics,
    timestamp: new Date().toISOString(),
    version: CONSENT_VERSION,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  emit(consent);
  return consent;
}

export function acceptAll(): CookieConsent {
  return saveConsent({ functional: true, analytics: true });
}

export function rejectOptional(): CookieConsent {
  return saveConsent({ functional: false, analytics: false });
}

export function resetConsent(): void {
  localStorage.removeItem(STORAGE_KEY);
  emit(null);
}

export function onChange(cb: Listener): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

/** Удобная синхронная проверка — разрешена ли категория */
export function isAllowed(category: CookieCategory): boolean {
  if (category === 'necessary') return true;
  const c = getConsent();
  if (!c) return false;
  return c[category] === true;
}
