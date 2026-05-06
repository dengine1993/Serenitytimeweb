import { HelpCircle, Zap, Sparkles, Brain, Clock, Heart } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { JIVA_CHAT_LIMITS } from '@/config/jivaLimits';

interface Props {
  isPremium: boolean;
  isEn: boolean;
  className?: string;
}

/**
 * Поповер «?» рядом с Jiva в чате — объясняет разницу между Jiva Fast (Free)
 * и Jiva Deep (Premium) маркетинговым языком, без брендов моделей.
 */
export const JivaModeInfo = ({ isPremium, isEn, className }: Props) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={isEn ? 'About Jiva modes' : 'О режимах Jiva'}
          className={cn(
            'inline-flex items-center justify-center w-5 h-5 rounded-full text-muted-foreground/70 hover:text-foreground hover:bg-muted/60 transition-colors',
            className,
          )}
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={8}
        className="w-[320px] p-0 overflow-hidden border-border/60"
      >
        <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {isEn ? 'Two Jivas — for two moments' : 'Две Jiva — для двух моментов'}
          </p>
        </div>

        {/* Fast */}
        <div className="px-4 py-3 border-b border-border/40">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-foreground/70" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Jiva Fast</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Free
                </span>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-2">
            {isEn
              ? 'Quick warm replies. Here when something hurts and you need to be heard right now.'
              : 'Быстрые тёплые ответы. Рядом, когда болит и хочется, чтобы тебя просто услышали прямо сейчас.'}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
            <Clock className="w-3 h-3" />
            <span>{isEn ? `${JIVA_CHAT_LIMITS.freeFastDailyLimit} conversations a day` : `${JIVA_CHAT_LIMITS.freeFastDailyLimit} разговоров в день`}</span>
          </div>
        </div>

        {/* Deep */}
        <div className="px-4 py-3 bg-gradient-to-br from-violet-500/[0.04] to-transparent">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-violet-500 dark:text-violet-300" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Jiva Deep</span>
                <span className="text-[10px] uppercase tracking-wider text-violet-600 dark:text-violet-300 font-semibold">
                  Premium
                </span>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-2">
            {isEn
              ? 'Goes deeper. Remembers what you said a week ago, connects the dots and stays with you for the long haul.'
              : 'Идёт глубже. Помнит, что ты сказал неделю назад, связывает события и остаётся рядом надолго.'}
          </p>
          <ul className="space-y-1 text-[11px] text-muted-foreground/85">
            <li className="flex items-center gap-1.5">
              <Brain className="w-3 h-3 text-violet-500/80" />
              <span>{isEn ? 'Remembers your story' : 'Помнит твою историю'}</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Heart className="w-3 h-3 text-violet-500/80" />
              <span>{isEn ? 'Deeper empathy and nuance' : 'Глубже эмпатия и нюансы'}</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-violet-500/80" />
              <span>{isEn ? `${JIVA_CHAT_LIMITS.premiumDailyLimit} conversations a day` : `${JIVA_CHAT_LIMITS.premiumDailyLimit} разговоров в день`}</span>
            </li>
          </ul>
        </div>

        <div className="px-4 py-2.5 bg-muted/20 border-t border-border/40">
          {isPremium ? (
            <p className="text-[11px] text-muted-foreground text-center">
              {isEn ? '✨ Premium is active' : '✨ Premium активен'}
            </p>
          ) : (
            <Link
              to="/premium"
              className="block text-center text-xs font-medium text-violet-600 dark:text-violet-300 hover:underline"
            >
              {isEn ? 'Open Jiva Deep — Premium →' : 'Открыть Jiva Deep — Premium →'}
            </Link>
          )}
        </div>

        <p className="px-4 py-2 text-[10px] text-muted-foreground/60 text-center bg-background">
          {isEn
            ? `New users get ${JIVA_CHAT_LIMITS.freeDeepTotalLimit} deep messages on Jiva Deep — to feel the difference.`
            : `Новым даём ${JIVA_CHAT_LIMITS.freeDeepTotalLimit} глубоких сообщений на Jiva Deep — чтобы почувствовать разницу.`}
        </p>
      </PopoverContent>
    </Popover>
  );
};
