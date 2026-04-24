import { useNavigate } from 'react-router-dom';
import { Compass, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useHomeTheme } from '@/hooks/useHomeTheme';
import { cn } from '@/lib/utils';

export function NavigatorCompactCard() {
  const navigate = useNavigate();
  const { theme } = useHomeTheme();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      onClick={() => navigate('/navigator')}
      className={cn(
        "rounded-3xl p-5 transition-all duration-300 cursor-pointer group gpu-accelerated",
        theme === 'light'
          ? "bg-white/80 border-2 border-primary/30 shadow-md hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1"
          : "bg-gradient-to-br from-primary/10 via-card/50 to-card/30 backdrop-blur-xl border-2 border-primary/40 hover:border-primary/60 hover:shadow-[0_0_60px_hsl(var(--primary)/0.4)] hover:-translate-y-2 hover:scale-[1.02]"
      )}
      role="button"
      tabIndex={0}
      aria-label="Открыть Навигатор для структурирования мыслей"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate('/navigator');
        }
      }}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "p-2.5 rounded-xl transition-colors",
          theme === 'light' 
            ? "bg-primary/10 group-hover:bg-primary/15" 
            : "bg-primary/10 group-hover:bg-primary/20"
        )}>
          <Compass className="h-5 w-5 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className={cn(
              "text-sm font-semibold",
              theme === 'light' ? "text-slate-800" : "text-foreground"
            )}>
              Навигатор
            </h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
              Шаг за шагом
            </span>
          </div>
          <p className={cn(
            "text-xs leading-relaxed line-clamp-2",
            theme === 'light' ? "text-slate-500" : "text-muted-foreground/90"
          )}>
            Пошаговый гид через тревогу и панику
          </p>
        </div>

        <ArrowRight className={cn(
          "h-5 w-5 group-hover:translate-x-1 transition-all flex-shrink-0 mt-0.5",
          theme === 'light' 
            ? "text-slate-400 group-hover:text-primary" 
            : "text-muted-foreground/60 group-hover:text-primary"
        )} />
      </div>
    </motion.div>
  );
}
