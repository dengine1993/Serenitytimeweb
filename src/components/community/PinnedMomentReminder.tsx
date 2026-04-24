import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PinnedMomentReminder() {
  const navigate = useNavigate();

  return (
    <motion.button
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => navigate('/app')}
      className="mx-4 mt-2 p-3 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border border-amber-200/50 dark:border-amber-500/20 flex items-center gap-3 group hover:shadow-lg transition-all"
    >
      <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-500/20">
        <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="flex-1 text-left">
        <p className="text-sm font-medium text-foreground">
          Поделись моментом дня
        </p>
        <p className="text-xs text-muted-foreground">
          Один раз в день на Главной
        </p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
    </motion.button>
  );
}
