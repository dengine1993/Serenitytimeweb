import { MoonIcon, SunIcon } from '@heroicons/react/24/solid';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface HomeThemeToggleProps {
  theme: 'light' | 'dark';
  onToggle: () => void;
}

export function HomeThemeToggle({ theme, onToggle }: HomeThemeToggleProps) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onToggle}
      className={cn(
        "p-2 rounded-xl transition-all duration-300",
        "border backdrop-blur-sm",
        theme === 'light' 
          ? "bg-white/60 border-slate-200/60 text-slate-600 hover:bg-white/80 shadow-sm"
          : "bg-card/60 border-border/40 text-muted-foreground hover:bg-card/80"
      )}
      aria-label={theme === 'light' ? 'Переключить на тёмную тему' : 'Переключить на светлую тему'}
    >
      {theme === 'light' ? (
        <MoonIcon className="h-4 w-4" />
      ) : (
        <SunIcon className="h-4 w-4" />
      )}
    </motion.button>
  );
}
