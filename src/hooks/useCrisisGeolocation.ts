import { useState, useEffect } from 'react';
import { useI18n } from './useI18n';

interface Hotline {
  name: string;
  phone: string;
  description?: string;
}

interface HotlinesByCountry {
  [key: string]: Hotline[];
}

const HOTLINES_BY_COUNTRY: HotlinesByCountry = {
  RU: [
    { name: 'Телефон доверия', phone: '8-800-2000-122', description: 'Бесплатно, круглосуточно' },
    { name: 'Центр экстренной помощи', phone: '112', description: 'Экстренные службы' },
    { name: 'Психологическая помощь', phone: '051', description: 'Бесплатно с мобильного' },
  ],
  US: [
    { name: '988 Suicide & Crisis Lifeline', phone: '988', description: 'US, 24/7' },
    { name: 'Crisis Text Line', phone: 'Text HOME to 741741', description: 'US' },
    { name: 'National Suicide Prevention', phone: '1-800-273-8255', description: 'US' },
  ],
  UK: [
    { name: 'Samaritans', phone: '116 123', description: 'UK, 24/7' },
    { name: 'CALM', phone: '0800 58 58 58', description: 'UK' },
    { name: 'Papyrus HOPELINEUK', phone: '0800 068 4141', description: 'UK' },
  ],
  DE: [
    { name: 'Telefonseelsorge', phone: '0800 111 0 111', description: 'DE, 24/7' },
    { name: 'Telefonseelsorge (alt)', phone: '0800 111 0 222', description: 'DE' },
    { name: 'Nummer gegen Kummer', phone: '116 111', description: 'DE' },
  ],
  FR: [
    { name: 'SOS Amitié', phone: '09 72 39 40 50', description: 'FR, 24/7' },
    { name: 'Fil Santé Jeunes', phone: '0 800 235 236', description: 'FR' },
    { name: 'Suicide Écoute', phone: '01 45 39 40 00', description: 'FR' },
  ],
  UA: [
    { name: 'Лайфлайн Україна', phone: '7333', description: 'UA, 24/7' },
    { name: 'Гаряча лінія для дітей', phone: '0-800-500-335', description: 'UA' },
    { name: 'Національна гаряча лінія', phone: '7333', description: 'UA' },
  ],
};

const getDefaultsForLanguage = (language: string): Hotline[] => {
  if (language === 'ru') return HOTLINES_BY_COUNTRY.RU;
  if (language === 'de') return HOTLINES_BY_COUNTRY.DE;
  if (language === 'fr') return HOTLINES_BY_COUNTRY.FR;
  if (language === 'uk' || language === 'ua') return HOTLINES_BY_COUNTRY.UA;
  // English / fallback
  return HOTLINES_BY_COUNTRY.US;
};

const getDefaultCountryForLanguage = (language: string): string => {
  if (language === 'ru') return 'RU';
  if (language === 'de') return 'DE';
  if (language === 'fr') return 'FR';
  if (language === 'uk' || language === 'ua') return 'UA';
  return 'US';
};

export const useCrisisGeolocation = () => {
  const { language } = useI18n();
  const [countryCode, setCountryCode] = useState<string>(() => getDefaultCountryForLanguage(language));
  const [hotlines, setHotlines] = useState<Hotline[]>(() => getDefaultsForLanguage(language));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Show language-based defaults immediately, refine with geo asynchronously
    setHotlines(getDefaultsForLanguage(language));
    setCountryCode(getDefaultCountryForLanguage(language));

    let cancelled = false;
    const detectCountry = async () => {
      try {
        const response = await fetch('https://ipapi.co/country/', {
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok || cancelled) return;
        const code = (await response.text()).trim();
        if (HOTLINES_BY_COUNTRY[code]) {
          setCountryCode(code);
          setHotlines(HOTLINES_BY_COUNTRY[code]);
        }
      } catch {
        // ignore — defaults already in place
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    detectCountry();
    return () => {
      cancelled = true;
    };
  }, [language]);

  return { hotlines, isLoading, countryCode };
};
