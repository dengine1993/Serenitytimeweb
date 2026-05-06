/**
 * Capacitor-aware storage adapter for Supabase auth.
 *
 * Native (iOS/Android): @capacitor/preferences (хранится в native secure storage).
 * Web: localStorage.
 *
 * Реализует синхронный интерфейс Storage, но фактические операции на нативке
 * делаются асинхронно. Supabase ожидает GoTrue-совместимый async storage,
 * поэтому возвращаем Promise там, где нужно.
 */
import { Capacitor } from '@capacitor/core';

type AsyncStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

const isNative = Capacitor.isNativePlatform();

let preferencesPromise: Promise<typeof import('@capacitor/preferences').Preferences> | null = null;
const getPreferences = () => {
  if (!preferencesPromise) {
    preferencesPromise = import('@capacitor/preferences').then((m) => m.Preferences);
  }
  return preferencesPromise;
};

export const supabaseAuthStorage: AsyncStorage = isNative
  ? {
      async getItem(key) {
        const Preferences = await getPreferences();
        const { value } = await Preferences.get({ key });
        return value ?? null;
      },
      async setItem(key, value) {
        const Preferences = await getPreferences();
        await Preferences.set({ key, value });
      },
      async removeItem(key) {
        const Preferences = await getPreferences();
        await Preferences.remove({ key });
      },
    }
  : {
      async getItem(key) {
        try {
          return window.localStorage.getItem(key);
        } catch {
          return null;
        }
      },
      async setItem(key, value) {
        try {
          window.localStorage.setItem(key, value);
        } catch {
          /* ignore quota / privacy mode */
        }
      },
      async removeItem(key) {
        try {
          window.localStorage.removeItem(key);
        } catch {
          /* ignore */
        }
      },
    };
