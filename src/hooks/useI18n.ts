import { useState, useEffect } from 'react';
import ruTranslations from '@/i18n/ru.json';
import enTranslations from '@/i18n/en.json';

type Language = 'ru' | 'en';

// Type definition for translations structure - updated to match new i18n structure
type TranslationObject = typeof ruTranslations;

const STORAGE_KEY = 'app_language';

const translations: Record<Language, any> = {
  ru: ruTranslations,
  en: enTranslations
};

// Get initial language from localStorage or default to Russian
const getInitialLanguage = (): Language => {
  const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
  if (stored && (stored === 'ru' || stored === 'en')) {
    return stored;
  }
  
  // Default to Russian
  return 'ru';
};

let currentLanguage: Language = getInitialLanguage();
const listeners: Set<() => void> = new Set();

export const setLanguage = (lang: Language) => {
  currentLanguage = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  listeners.forEach(listener => listener());
};

export const getLanguage = () => currentLanguage;

export const useI18n = () => {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const listener = () => forceUpdate({});
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const t = (key: string, paramsOrFallback?: Record<string, unknown> | string): string => {
    const keys = key.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let value: any = translations[currentLanguage];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Return fallback if provided as string, otherwise return key
        return typeof paramsOrFallback === 'string' ? paramsOrFallback : key;
      }
    }

    if (typeof value !== 'string') {
      return typeof paramsOrFallback === 'string' ? paramsOrFallback : key;
    }

    // Replace parameters like {{days}} with actual values if params is an object
    if (paramsOrFallback && typeof paramsOrFallback === 'object') {
      return Object.entries(paramsOrFallback).reduce(
        (str, [param, val]) => str.replace(new RegExp(`{{${param}}}`, 'g'), String(val)),
        value
      );
    }

    return value;
  };

  const tArray = (key: string): string[] => {
    const keys = key.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let value: any = translations[currentLanguage];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return []; // Return empty array if translation not found
      }
    }

    if (Array.isArray(value)) {
      return value;
    }

    return [];
  };

  const translateText = (ruText: string, enText: string) =>
    currentLanguage === 'ru' ? ruText : enText;

  const getPlural = (key: 'day' | 'minute' | 'session' | 'hour' | 'person'): [string, string, string] => {
    const plurals = translations[currentLanguage].plurals;
    return plurals[key] as [string, string, string];
  };

  // Pluralization helper for Russian
  const pluralize = (count: number, forms: [string, string, string]): string => {
    const n = Math.abs(count) % 100;
    const n1 = n % 10;
    
    if (n > 10 && n < 20) return forms[2]; // 11-19 => many
    if (n1 > 1 && n1 < 5) return forms[1]; // 2-4 => few
    if (n1 === 1) return forms[0]; // 1 => one
    return forms[2]; // 0, 5-9 => many
  };

  // Translation with automatic pluralization for _plural suffix params
  const tp = (key: string, params?: Record<string, string | number>): string => {
    const baseTranslation = t(key, params);
    
    if (!params || currentLanguage !== 'ru') return baseTranslation;
    
    // Auto-pluralize known numeric parameters
    let result = baseTranslation;
    Object.entries(params).forEach(([paramKey, value]) => {
      if (typeof value === 'number') {
        let pluralKey: 'day' | 'minute' | 'session' | 'hour' | 'person' | null = null;
        
        if (paramKey === 'days') pluralKey = 'day';
        else if (paramKey === 'minutes') pluralKey = 'minute';
        else if (paramKey === 'hours') pluralKey = 'hour';
        else if (paramKey === 'sessions') pluralKey = 'session';
        
        if (pluralKey) {
          const pluralForm = pluralize(value, getPlural(pluralKey));
          // Add pluralized word after the number
          result = result.replace(`{{${paramKey}}}`, `{{${paramKey}}} ${pluralForm}`);
        }
      }
    });
    
    return result;
  };

  return { t, tArray, tp, language: currentLanguage, setLanguage, translate: translateText, getPlural };
};
