import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import jivaLogo from '@/assets/jiva.png';
import { useI18n } from '@/hooks/useI18n';
import { useJivaUsage } from '@/hooks/useJivaUsage';
import { cn } from '@/lib/utils';

interface JivaHeroCardProps {
  isPremium?: boolean;
}

// Free показывает только нейтральные строки — обещание памяти
// оставляем только для Premium (это часть Premium-ценности).
const FREE_SUBTITLES = [
  'home.jivaHero.subtitle1',
  'home.jivaHero.subtitle2',
  'home.jivaHero.subtitle4',
  'home.jivaHero.subtitle5',
];
const PREMIUM_SUBTITLES = [
  'home.jivaHero.subtitle1',
  'home.jivaHero.subtitle2',
  'home.jivaHero.subtitle3',
  'home.jivaHero.subtitle4',
  'home.jivaHero.subtitle5',
];

export function JivaHeroCard({ isPremium = false }: JivaHeroCardProps) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { used, limit, left, isLoading: usageLoading } = useJivaUsage();
  const subtitleKeys = useMemo(
    () => (isPremium ? PREMIUM_SUBTITLES : FREE_SUBTITLES),
    [isPremium]
  );
  const [subtitleIdx, setSubtitleIdx] = useState(0);

  useEffect(() => {
    setSubtitleIdx(0);
    const id = window.setInterval(() => {
      setSubtitleIdx((i) => (i + 1) % subtitleKeys.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, [subtitleKeys]);

  const showBadge = !usageLoading;
  const isLow = left <= 1;
  const isExhausted = left === 0;

  return (
    <motion.button
      type="button"
      onClick={() => navigate('/ai-chat')}
      whileHover={{ scale: 1.005, y: -1 }}
      whileTap={{ scale: 0.995 }}
      aria-label={t('home.jivaHero.title')}
      className={cn(
        'group relative w-full overflow-hidden rounded-3xl px-4 py-3.5',
        'bg-gradient-to-br from-amber-600/20 via-amber-500/14 to-orange-400/10',
        'border border-amber-300/30',
        'shadow-[0_8px_28px_-10px_rgba(245,158,11,0.35)]',
        'hover:border-amber-200/45 hover:shadow-[0_12px_36px_-10px_rgba(245,158,11,0.5)]',
        'transition-all duration-300',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
      )}
    >
      {/* Soft static glow (без анимации — меньше шума) */}
      <div className="pointer-events-none absolute -left-6 -top-6 h-28 w-28 rounded-full bg-amber-500/20 blur-3xl" />

      <div className="relative flex items-center gap-3.5">
        {/* Logo */}
        <div className="relative flex-shrink-0">
          <img
            src={jivaLogo}
            alt="Jiva"
            className="relative h-14 w-14 rounded-full object-cover ring-2 ring-amber-300/35"
            loading="eager"
          />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0 text-left">
          <span className="block text-base font-semibold text-white leading-tight line-clamp-2">
            {t('home.jivaHero.title')}
          </span>
          <motion.p
            key={subtitleIdx}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mt-1 text-xs text-amber-100/80 line-clamp-1"
          >
            {t(subtitleKeys[subtitleIdx])}
          </motion.p>
          <div className="mt-1.5 flex items-center gap-2">
            {showBadge && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium',
                  'border backdrop-blur-sm',
                  isExhausted
                    ? 'bg-rose-500/20 text-rose-200 border-rose-400/30'
                    : isLow
                    ? 'bg-amber-500/25 text-amber-100 border-amber-300/40'
                    : 'bg-white/10 text-white/80 border-white/15'
                )}
                aria-label={`Осталось ${left} из ${limit} сообщений сегодня`}
              >
                <Sparkles className="h-2.5 w-2.5" />
                {used}/{limit}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300/90">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
              online
            </span>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 group-hover:bg-white/20 transition-colors">
          <ArrowRight className="h-4 w-4 text-white group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </motion.button>
  );
}
