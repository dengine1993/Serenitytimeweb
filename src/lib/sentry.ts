/**
 * Sentry init для «Восход» (web + native).
 *
 * DSN читается из env: VITE_SENTRY_DSN. Если не задан — Sentry просто молча отключён
 * (в т.ч. в Lovable preview), без падений.
 *
 * В нативном Capacitor-приложении используется @sentry/capacitor (нативные SDK
 * iOS/Android для крашей), который оборачивает @sentry/react для JS-ошибок.
 * В вебе работает только @sentry/react.
 */
import * as SentryReact from '@sentry/react';
import * as SentryCapacitor from '@sentry/capacitor';
import { Capacitor } from '@capacitor/core';

declare const __APP_VERSION__: string;

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const ENV = import.meta.env.MODE;
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';

export function initSentry() {
  if (!DSN) return;

  // Не шлём ошибки из Lovable preview/sandbox.
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.includes('lovable.app') || host.includes('lovableproject.com')) return;
  }

  const platform = Capacitor.getPlatform(); // 'web' | 'ios' | 'android'

  const options = {
    dsn: DSN,
    environment: ENV,
    release: `newdawn@${APP_VERSION}`,
    dist: platform,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    beforeSend(event: any) {
      if (event.request?.data) delete event.request.data;
      if (event.extra) {
        for (const k of Object.keys(event.extra)) {
          if (/content|note|message|prompt|text/i.test(k)) delete event.extra[k];
        }
      }
      return event;
    },
  } as any;

  if (Capacitor.isNativePlatform()) {
    SentryCapacitor.init(options, SentryReact.init as any);
  } else {
    SentryReact.init(options);
  }
}
