import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { ArrowRightOnRectangleIcon, Cog6ToothIcon, ShieldCheckIcon } from '@heroicons/react/24/solid';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import logoBezm from '@/assets/logo-bezm.png';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Crown, Flame } from 'lucide-react';
import { useMoodEntries } from '@/hooks/useMoodEntries';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HomeHeaderProps {
  userName: string;
  isPremium: boolean;
  avatarUrl?: string;
}

export function HomeHeader({ userName, isPremium, avatarUrl }: HomeHeaderProps) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { stats } = useMoodEntries();
  const streak = stats?.streak ?? 0;
  const [greeting, setGreeting] = useState('Добрый вечер');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting('Доброе утро');
    } else if (hour >= 12 && hour < 18) {
      setGreeting('Добрый день');
    } else if (hour >= 18 && hour < 23) {
      setGreeting('Добрый вечер');
    } else {
      setGreeting('Доброй ночи');
    }
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch {
      // signOut уже показывает toast с ошибкой
    }
  };

  return (
    <motion.header 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 max-w-7xl mx-auto w-full"
      role="banner"
    >
      {/* Логотип слева */}
      <Link to="/app" className="flex items-center gap-2 group shrink-0">
        <motion.div
          whileHover={{ scale: 1.1 }}
          transition={{ duration: 0.3 }}
        >
          <img 
            src={logoBezm} 
            alt="Восход" 
            className="w-11 h-11 sm:w-12 sm:h-12 object-contain drop-shadow-md -translate-y-0.5"
          />
        </motion.div>
        <span className="text-lg font-bold tracking-[0.18em] bg-clip-text text-transparent hidden sm:inline bg-gradient-to-r from-orange-400 via-amber-300 to-rose-300">
          ВОСХОД
        </span>
      </Link>

      {/* Приветствие по центру */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="flex-1 flex items-center justify-center px-2 sm:px-4"
      >
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-base sm:text-xl md:text-2xl font-semibold leading-none truncate">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber via-amber to-amber/80">
              {greeting}
            </span>
            <span className="text-foreground/70 hidden sm:inline">, {userName}</span>
          </h1>
          {streak > 0 && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                bg-orange-500/15 text-orange-300 text-xs font-semibold align-middle
                border border-orange-400/20 shrink-0"
              aria-label={`Стрик ${streak} дней`}
            >
              <Flame className="w-3 h-3" />
              {streak}
            </span>
          )}
          {isPremium && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
              bg-gradient-to-r from-amber-500/20 to-orange-500/20
              text-amber-400 text-xs font-medium align-middle shrink-0">
              <Crown className="w-3 h-3" />
            </span>
          )}
        </div>
      </motion.div>
      
      {/* Действия справа */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="flex items-center gap-1.5 sm:gap-2"
      >
        <NotificationBell />
        
        {/* Profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
              className="focus:outline-none relative"
            >
              {/* Soft glow ring for Premium */}
              {isPremium && (
                <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 opacity-60 blur-[2px]" />
              )}
              <Avatar className={cn(
                "relative h-8 w-8 sm:h-10 sm:w-10 transition-all duration-300 cursor-pointer",
                isPremium ? 'ring-2 ring-amber-400 shadow-md shadow-amber-400/20' : 'ring-2 ring-border/50'
              )}>
                <AvatarImage src={avatarUrl} alt={userName} />
                <AvatarFallback className="text-xs sm:text-sm bg-primary/10 text-primary">
                  {userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </motion.button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
              <Cog6ToothIcon className="w-4 h-4 mr-2" />
              Настройки
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem onClick={() => navigate('/admin')} className="cursor-pointer">
                <ShieldCheckIcon className="w-4 h-4 mr-2" />
                Админ-панель
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
              <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2" />
              Выйти
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>
    </motion.header>
  );
}
