import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import jivaLogo from '@/assets/jiva.png';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '@/lib/utils';

const SUBTITLE_KEYS = [
  'home.jivaHero.subtitle1',
  'home.jivaHero.subtitle2',
  'home.jivaHero.subtitle3',
];

export function JivaHeroCard() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [subtitleIdx, setSubtitleIdx] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSubtitleIdx((i) => (i + 1) % SUBTITLE_KEYS.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, []);

  return (
    <motion.button
      type="button"
      onClick={() => navigate('/ai-chat')}
      whileHover={{ scale: 1.01, y: -1 }}
      whileTap={{ scale: 0.99 }}
      aria-label={t('home.jivaHero.title')}
      className={cn(
        'group relative w-full overflow-hidden rounded-3xl px-4 py-3.5',
        'bg-gradient-to-br from-violet-600/25 via-purple-600/18 to-fuchsia-500/12',
        'border border-violet-400/30',
        'shadow-[0_8px_32px_-8px_rgba(139,92,246,0.45)]',
        'hover:border-violet-300/50 hover:shadow-[0_12px_40px_-8px_rgba(139,92,246,0.6)]',
        'transition-all duration-300',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
      )}
    >
      {/* Soft glow behind logo */}
      <div className="pointer-events-none absolute -left-6 -top-6 h-28 w-28 rounded-full bg-violet-500/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-fuchsia-500/15 blur-3xl" />

      <div className="relative flex items-center gap-3.5">
        {/* Logo with halo */}
        <div className="relative flex-shrink-0">
          <motion.div
            className="absolute inset-0 rounded-full bg-violet-400/30 blur-md"
            animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.08, 1] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <img
            src={jivaLogo}
            alt="Jiva"
            className="relative h-14 w-14 rounded-full object-cover ring-2 ring-violet-300/40"
            loading="eager"
          />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-white">
              {t('home.jivaHero.title')}
            </span>
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" aria-hidden />
          </div>
          <motion.p
            key={subtitleIdx}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mt-0.5 text-xs text-violet-100/80 truncate"
          >
            {t(SUBTITLE_KEYS[subtitleIdx])}
          </motion.p>
        </div>

        {/* Arrow */}
        <div className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 group-hover:bg-white/20 transition-colors">
          <ArrowRight className="h-4 w-4 text-white group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </motion.button>
  );
}
