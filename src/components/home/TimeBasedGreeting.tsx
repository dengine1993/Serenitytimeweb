import { motion } from 'framer-motion';
import { Sun, Moon, Sunrise, Sunset } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeBasedGreetingProps {
  userName: string;
  theme: 'light' | 'dark';
}

function getGreetingData() {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) {
    return {
      text: 'Доброе утро',
      icon: Sunrise,
      gradient: 'from-amber-400 to-orange-500',
      bgGlow: 'bg-amber-500/20'
    };
  } else if (hour >= 12 && hour < 17) {
    return {
      text: 'Добрый день',
      icon: Sun,
      gradient: 'from-yellow-400 to-amber-500',
      bgGlow: 'bg-yellow-500/20'
    };
  } else if (hour >= 17 && hour < 21) {
    return {
      text: 'Добрый вечер',
      icon: Sunset,
      gradient: 'from-orange-400 to-rose-500',
      bgGlow: 'bg-orange-500/20'
    };
  } else {
    return {
      text: 'Доброй ночи',
      icon: Moon,
      gradient: 'from-indigo-400 to-purple-500',
      bgGlow: 'bg-indigo-500/20'
    };
  }
}

export function TimeBasedGreeting({ userName, theme }: TimeBasedGreetingProps) {
  const { text, icon: Icon, gradient, bgGlow } = getGreetingData();

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 mb-6"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.2 }}
        className={cn(
          "p-3 rounded-2xl",
          theme === 'light' ? 'bg-gradient-to-br from-amber-100 to-orange-100' : bgGlow
        )}
      >
        <Icon className={cn(
          "h-6 w-6",
          theme === 'light' ? 'text-amber-600' : `bg-gradient-to-r ${gradient} bg-clip-text text-transparent`
        )} />
      </motion.div>
      <div>
        <h1 className={cn(
          "text-2xl font-bold",
          theme === 'light' ? 'text-slate-800' : 'text-foreground'
        )}>
          {text}, {userName}!
        </h1>
        <p className={cn(
          "text-sm",
          theme === 'light' ? 'text-slate-600' : 'text-muted-foreground'
        )}>
          Как ты себя чувствуешь сегодня?
        </p>
      </div>
    </motion.div>
  );
}
