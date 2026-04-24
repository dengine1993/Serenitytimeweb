import { useState, useEffect } from 'react';
import { useI18n } from './useI18n';

interface Hotline {
  name: string;
  phone: string;
}

interface HotlinesByCountry {
  [key: string]: Hotline[];
}

const HOTLINES_BY_COUNTRY: HotlinesByCountry = {
  RU: [
    { name: 'Телефон доверия', phone: '8-800-2000-122' },
    { name: 'Центр экстренной психологической помощи', phone: '051' },
    { name: 'Помощь рядом', phone: '8-495-988-44-34' }
  ],
  US: [
    { name: '988 Suicide & Crisis Lifeline', phone: '988' },
    { name: 'Crisis Text Line', phone: 'Text HOME to 741741' },
    { name: 'National Suicide Prevention', phone: '1-800-273-8255' }
  ],
  UK: [
    { name: 'Samaritans', phone: '116 123' },
    { name: 'CALM', phone: '0800 58 58 58' },
    { name: 'Papyrus HOPELINEUK', phone: '0800 068 4141' }
  ],
  DE: [
    { name: 'Telefonseelsorge', phone: '0800 111 0 111' },
    { name: 'Telefonseelsorge (alt)', phone: '0800 111 0 222' },
    { name: 'Nummer gegen Kummer', phone: '116 111' }
  ],
  FR: [
    { name: 'SOS Amitié', phone: '09 72 39 40 50' },
    { name: 'Fil Santé Jeunes', phone: '0 800 235 236' },
    { name: 'Suicide Écoute', phone: '01 45 39 40 00' }
  ],
  UA: [
    { name: 'Лайфлайн Україна', phone: '7333' },
    { name: 'Гаряча лінія для дітей', phone: '0-800-500-335' },
    { name: 'Національна гаряча лінія', phone: '7333' }
  ]
};

const DEFAULT_HOTLINES: Hotline[] = [
  { name: 'International Association for Suicide Prevention', phone: 'Visit IASP' },
  { name: 'Befrienders Worldwide', phone: 'befrienders.org' },
  { name: 'Crisis Text Line', phone: 'Text HOME' }
];

export const useCrisisGeolocation = () => {
  const { language } = useI18n();
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [hotlines, setHotlines] = useState<Hotline[]>(
    language === 'ru' ? HOTLINES_BY_COUNTRY.RU : DEFAULT_HOTLINES
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const detectCountry = async () => {
      try {
        const response = await fetch('https://ipapi.co/country/', {
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          const code = await response.text();
          setCountryCode(code.trim());
          
          if (HOTLINES_BY_COUNTRY[code.trim()]) {
            setHotlines(HOTLINES_BY_COUNTRY[code.trim()]);
          } else if (language === 'ru') {
            setHotlines(HOTLINES_BY_COUNTRY.RU);
          } else {
            setHotlines(DEFAULT_HOTLINES);
          }
        }
      } catch (err) {
        console.log('Geolocation failed, using defaults');
        // Use language-based default
        if (language === 'ru') {
          setCountryCode('RU');
          setHotlines(HOTLINES_BY_COUNTRY.RU);
        }
      } finally {
        setIsLoading(false);
      }
    };

    detectCountry();
  }, [language]);

  return { hotlines, isLoading, countryCode };
};
