import { useNavigate } from 'react-router-dom';
import { PaintBrushIcon, BookOpenIcon } from '@heroicons/react/24/solid';
import { motion } from 'framer-motion';
import { useHomeTheme } from '@/hooks/useHomeTheme';
import { cn } from '@/lib/utils';

const actions = [
  {
    id: 'art',
    icon: PaintBrushIcon,
    title: 'Образ дня',
    href: '/art-therapy',
    color: 'text-violet',
    lightColor: 'text-violet-500',
    bgColor: 'from-violet/10 via-card/40',
    lightBgColor: 'bg-violet-50/80',
    borderColor: 'border-violet/40 hover:border-violet/60',
    lightBorderColor: 'border-violet-200/60 hover:border-violet-300',
    glowColor: 'hover:shadow-violet/30',
    lightGlowColor: 'hover:shadow-violet-200/50',
  },
  {
    id: 'diary',
    icon: BookOpenIcon,
    title: 'Дневник',
    href: '/diary',
    color: 'text-emerald',
    lightColor: 'text-emerald-500',
    bgColor: 'from-emerald/10 via-card/40',
    lightBgColor: 'bg-emerald-50/80',
    borderColor: 'border-emerald/40 hover:border-emerald/60',
    lightBorderColor: 'border-emerald-200/60 hover:border-emerald-300',
    glowColor: 'hover:shadow-emerald/30',
    lightGlowColor: 'hover:shadow-emerald-200/50',
  },
];

export function QuickActionsList() {
  const navigate = useNavigate();
  const { theme } = useHomeTheme();

  return (
    <div className="space-y-2">
      <h3 className={cn(
        "text-xs font-medium px-1 mb-3",
        theme === 'light' ? "text-slate-500" : "text-muted-foreground/90"
      )}>
        Быстрые действия
      </h3>
      
      {actions.map((action, index) => (
        <motion.button
          key={action.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 + index * 0.05 }}
          onClick={() => navigate(action.href)}
          className={cn(
            "relative overflow-hidden w-full flex items-center gap-3 rounded-2xl transition-all duration-300 group p-3",
            "hover:scale-105 active:scale-95 gpu-accelerated",
            "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background",
            theme === 'light' 
              ? cn(
                  action.lightBgColor,
                  "border-2",
                  action.lightBorderColor,
                  "shadow-sm",
                  action.lightGlowColor
                )
              : cn(
                  "bg-gradient-to-br to-card/30 backdrop-blur-xl border-2",
                  action.bgColor,
                  action.borderColor,
                  action.glowColor
                )
          )}
          aria-label={action.title}
          type="button"
        >
          <span className="absolute inset-0 overflow-hidden rounded-2xl">
            <span className={cn(
              "absolute inset-0 rounded-full scale-0 group-hover:animate-ripple",
              theme === 'light' ? "bg-slate-200/30" : "bg-white/20"
            )} />
          </span>
          
          <div className={cn(
            "relative p-1.5 rounded-lg transition-transform duration-300 group-hover:scale-110",
            theme === 'light' ? "bg-white/60" : "bg-background/50"
          )}>
            <action.icon className={cn(
              'h-5 w-5',
              theme === 'light' ? action.lightColor : action.color
            )} />
          </div>
          <span className={cn(
            "relative font-medium transition-colors text-sm",
            theme === 'light' ? "text-slate-700 group-hover:text-slate-900" : "text-foreground group-hover:text-foreground/90"
          )}>
            {action.title}
          </span>
        </motion.button>
      ))}
    </div>
  );
}
