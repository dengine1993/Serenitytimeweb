import { useState, useEffect, createContext, useContext } from 'react';

type HomeTheme = 'light' | 'dark';

interface HomeThemeContextType {
  theme: HomeTheme;
  toggleTheme: () => void;
}

export const HomeThemeContext = createContext<HomeThemeContextType | null>(null);

export function useHomeTheme() {
  const context = useContext(HomeThemeContext);
  if (!context) {
    // Fallback for usage outside provider
    return { theme: 'dark' as HomeTheme, toggleTheme: () => {} };
  }
  return context;
}

export function useHomeThemeState() {
  const [theme, setTheme] = useState<HomeTheme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('home-theme') as HomeTheme) || 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    localStorage.setItem('home-theme', theme);
    
    // Apply .light class to document for CSS variable switching
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return { theme, toggleTheme };
}
