import { useNavigate } from 'react-router-dom';
import { PaintBrushIcon, BookOpenIcon, UsersIcon } from '@heroicons/react/24/solid';
import { motion } from 'framer-motion';
import { useHomeTheme } from '@/hooks/useHomeTheme';
import { cn } from '@/lib/utils';

// Calm, anxiety-friendly color palette
const actions = [
  {
    id: 'community',
    icon: UsersIcon,
    title: 'Сообщество',
    subtitle: 'Люди, кто понимает',
    href: '/community',
    lightBg: 'bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-100/80',
    darkBg: 'bg-gradient-to-br from-violet-600/25 via-purple-600/18 to-fuchsia-500/12',
    iconColor: 'text-violet-600',
    iconColorDark: 'text-violet-200',
    borderLight: 'border-violet-200/70 hover:border-violet-300',
    borderDark: 'border-violet-400/30 hover:border-violet-300/50',
    glowLight: 'hover:shadow-violet-200/50',
    glowDark: 'hover:shadow-violet-900/40',
    accent: true,
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
    title: 'Образ дня',
    subtitle: 'Нарисуй настроение',
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
] as const;

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

      <div className="grid grid-cols-2 gap-3">
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
                ? cn(action.lightBg, "border", action.borderLight, "shadow-sm hover:shadow-md", action.glowLight)
                : cn(action.darkBg, "border", action.borderDark, "shadow-lg", action.glowDark),
              'accent' in action && action.accent && "shadow-[0_8px_28px_-10px_rgba(139,92,246,0.45)]"
            )}
            aria-label={action.title}
            type="button"
          >
            {'accent' in action && action.accent && (
              <>
                <div className="pointer-events-none absolute -left-6 -top-6 h-20 w-20 rounded-full bg-violet-500/25 blur-2xl" />
                <div className="pointer-events-none absolute -right-8 -bottom-8 h-24 w-24 rounded-full bg-fuchsia-500/15 blur-2xl" />
              </>
            )}

            <div className={cn(
              "relative p-2 rounded-xl transition-all duration-300",
              theme === 'light' ? "bg-white/70" : "bg-white/10",
              'accent' in action && action.accent && "ring-1 ring-violet-300/40"
            )}>
              {'accent' in action && action.accent && (
                <div className="absolute inset-0 rounded-xl bg-violet-400/25 blur-md" aria-hidden />
              )}
              <action.icon
                className={cn(
                  "h-6 w-6 relative",
                  theme === 'light' ? action.iconColor : action.iconColorDark
                )}
                aria-hidden="true"
              />
            </div>

            <div className="flex flex-col items-center min-w-0 w-full px-1 relative">
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
