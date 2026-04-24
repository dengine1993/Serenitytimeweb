import { useNavigate } from 'react-router-dom';
import { PaintBrushIcon, BookOpenIcon, MapIcon, UsersIcon } from '@heroicons/react/24/solid';
import { motion } from 'framer-motion';
import { useHomeTheme } from '@/hooks/useHomeTheme';
import { cn } from '@/lib/utils';
import jivaLogo from '@/assets/jiva.png';

// Calm, anxiety-friendly color palette - positive actions first
const actions = [
  {
    id: 'jiva',
    isJiva: true,
    title: 'Jiva',
    subtitle: 'ИИ-психолог',
    href: '/ai-chat',
    lightBg: 'bg-gradient-to-br from-violet-50 to-fuchsia-100/80',
    darkBg: 'bg-gradient-to-br from-violet-900/40 to-fuchsia-900/30',
    iconColor: 'text-violet-600',
    iconColorDark: 'text-violet-200',
    borderLight: 'border-violet-200/60 hover:border-violet-300',
    borderDark: 'border-violet-700/40 hover:border-violet-600/50',
    glowLight: 'hover:shadow-violet-200/40',
    glowDark: 'hover:shadow-violet-900/30',
  },
  {
    id: 'diary',
    icon: BookOpenIcon,
    title: 'Дневник',
    subtitle: 'Мысли и чувства',
    href: '/diary',
    lightBg: 'bg-gradient-to-br from-emerald-50 to-teal-100/80',
    darkBg: 'bg-gradient-to-br from-emerald-900/40 to-emerald-950/30',
    iconColor: 'text-emerald-600',
    iconColorDark: 'text-emerald-300',
    borderLight: 'border-emerald-200/60 hover:border-emerald-300',
    borderDark: 'border-emerald-800/30 hover:border-emerald-700/40',
    glowLight: 'hover:shadow-emerald-200/40',
    glowDark: 'hover:shadow-emerald-900/20',
  },
  {
    id: 'art',
    icon: PaintBrushIcon,
    title: 'Арт-терапия',
    subtitle: 'Рисуй и анализируй',
    href: '/art-therapy',
    lightBg: 'bg-gradient-to-br from-violet-50 to-purple-100/80',
    darkBg: 'bg-gradient-to-br from-slate-800/40 to-slate-850/30',
    iconColor: 'text-violet-500',
    iconColorDark: 'text-slate-300',
    borderLight: 'border-violet-200/60 hover:border-violet-300',
    borderDark: 'border-slate-700/30 hover:border-slate-600/40',
    glowLight: 'hover:shadow-violet-200/40',
    glowDark: 'hover:shadow-slate-800/20',
  },
  {
    id: 'navigator',
    icon: MapIcon,
    title: 'Навигатор',
    subtitle: 'Помощь при тревоге',
    href: '/navigator',
    lightBg: 'bg-gradient-to-br from-sky-50 to-blue-100/80',
    darkBg: 'bg-gradient-to-br from-cyan-900/40 to-slate-900/30',
    iconColor: 'text-sky-600',
    iconColorDark: 'text-cyan-300',
    borderLight: 'border-sky-200/60 hover:border-sky-300',
    borderDark: 'border-cyan-800/30 hover:border-cyan-700/40',
    glowLight: 'hover:shadow-sky-200/40',
    glowDark: 'hover:shadow-cyan-900/20',
  },
  {
    id: 'community',
    icon: UsersIcon,
    title: 'Сообщество',
    subtitle: 'Люди, кто понимает',
    href: '/community',
    lightBg: 'bg-gradient-to-br from-blue-50 to-slate-100/80',
    darkBg: 'bg-gradient-to-br from-slate-800/40 to-slate-900/30',
    iconColor: 'text-blue-600',
    iconColorDark: 'text-slate-300',
    borderLight: 'border-blue-200/60 hover:border-blue-300',
    borderDark: 'border-slate-700/30 hover:border-slate-600/40',
    glowLight: 'hover:shadow-blue-200/40',
    glowDark: 'hover:shadow-slate-800/20',
  },
  {
    id: 'crisis',
    title: 'Срочная помощь',
    subtitle: 'Дыхание и заземление',
    href: '/crisis',
    lightBg: 'bg-gradient-to-br from-red-50 to-rose-100/70',
    darkBg: 'bg-gradient-to-br from-red-950/30 to-rose-950/20',
    iconColor: 'text-red-600',
    iconColorDark: 'text-red-300',
    borderLight: 'border-red-200/60 hover:border-red-300',
    borderDark: 'border-red-900/30 hover:border-red-800/40',
    glowLight: 'hover:shadow-red-200/40',
    glowDark: 'hover:shadow-red-900/20',
    urgent: true,
  },
];

export function QuickActionsGrid() {
  const navigate = useNavigate();
  const { theme } = useHomeTheme();

  return (
    <div className="space-y-3">
      <h3 className={cn(
        "text-sm font-medium px-1 tracking-wide",
        theme === 'light' ? "text-slate-600" : "text-gray-300"
      )}>
        Инструменты
      </h3>
      
      {/* 2x3 grid - calm tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {actions.map((action) => (
          <motion.button
            key={action.id}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(action.href)}
            className={cn(
              "relative overflow-hidden flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all duration-300",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "h-[90px]",
              theme === 'light' 
                ? cn(
                    action.lightBg,
                    "border",
                    action.borderLight,
                    "shadow-sm hover:shadow-md",
                    action.glowLight
                  )
                : cn(
                    action.darkBg,
                    "border",
                    action.borderDark,
                    "shadow-lg",
                    action.glowDark
                  )
            )}
            aria-label={action.title}
            type="button"
          >
            {/* Gentle pulse for crisis - soft breathing effect */}
            {action.urgent && (
              <motion.span 
                className={cn(
                  "absolute inset-0 rounded-2xl",
                  theme === 'light' 
                    ? "ring-1 ring-red-300/40" 
                    : "ring-1 ring-red-500/25"
                )}
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
            
            {action.urgent ? (
              <span
                className="relative z-10 inline-flex items-center justify-center px-2.5 h-8 min-w-[52px] rounded-lg text-sm font-extrabold tracking-widest text-white bg-red-600 shadow-[0_0_16px_rgba(239,68,68,0.55)]"
                aria-hidden="true"
              >
                SOS
              </span>
            ) : action.isJiva ? (
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-violet-400/40 blur-md animate-pulse" />
                <img
                  src={jivaLogo}
                  alt="Jiva"
                  className="relative h-10 w-10 rounded-full object-cover ring-2 ring-violet-300/50"
                />
              </div>
            ) : (
              <div className={cn(
                "relative p-2 rounded-xl transition-all duration-300",
                theme === 'light' ? "bg-white/70" : "bg-white/10"
              )}>
                <action.icon 
                  className={cn(
                    "h-6 w-6", 
                    theme === 'light' ? action.iconColor : action.iconColorDark
                  )} 
                  aria-hidden="true"
                />
              </div>
            )}
            
            <div className="flex flex-col items-center min-w-0 w-full px-1">
              <span className={cn(
                "font-medium text-center leading-tight truncate w-full",
                action.title.length > 10 ? "text-xs" : "text-sm",
                theme === 'light' ? "text-slate-700" : "text-gray-200"
              )}>
                {action.title}
              </span>
              <span className={cn(
                "text-xs text-center leading-tight mt-0.5 truncate w-full",
                theme === 'light' ? "text-slate-500" : "text-gray-400"
              )}>
                {action.subtitle}
              </span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
