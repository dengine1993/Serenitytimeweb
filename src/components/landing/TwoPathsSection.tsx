import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Leaf, Anchor, Brain, MessageCircle, History, Palette, Heart, Crown, Zap, Coffee, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";
import { PoweredByClaude } from "@/components/landing/PoweredByClaude";
import { QuickSignupModal } from "@/components/landing/QuickSignupModal";
import jivaAvatar from "@/assets/jiva.png";

export const TwoPathsSection = () => {
  const { t } = useI18n();
  const [signupOpen, setSignupOpen] = useState(false);
  const [signupPath, setSignupPath] = useState<"breath" | "anchor">("breath");

  const openSignup = (path: "breath" | "anchor") => {
    setSignupPath(path);
    setSignupOpen(true);
  };

  return (
    <section className="w-full px-4 sm:px-8 lg:px-16 xl:px-24 2xl:px-32 py-12 sm:py-20">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-10"
      >
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3">
          {t('index.twoPaths.title')}
        </h2>
      </motion.div>

      {/* Two Cards - Desktop side by side, Mobile stacked */}
      <div className="grid md:grid-cols-2 gap-6 lg:gap-8 xl:gap-12">
        
        {/* Breath Card - Free */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative bg-gradient-to-br from-emerald-950/40 via-slate-900/60 to-slate-900/40 backdrop-blur-xl rounded-3xl border border-emerald-500/20 p-6 sm:p-8"
        >
          {/* Badge */}
          <div className="absolute -top-3 left-6 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full">
            <span className="text-xs font-medium text-emerald-400">{t('index.twoPaths.breath.price')}</span>
          </div>

          {/* Header */}
          <div className="flex items-center gap-3 mb-4 mt-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <Leaf className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{t('index.twoPaths.breath.name')}</h3>
              <p className="text-sm text-white/60">{t('index.twoPaths.breath.essence')}</p>
            </div>
          </div>

          <p className="text-sm text-white/70 mb-4">{t('index.twoPaths.breath.essenceDetail')}</p>

          {/* Free features list — реальные лимиты */}
          <div className="bg-emerald-500/10 rounded-xl p-4 mb-4 border border-emerald-500/20">
            <p className="text-xs text-emerald-400/80 uppercase tracking-wide mb-2 font-medium">Что входит</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-white/90">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{t('index.twoPaths.breath.features.community')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/90">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{t('index.twoPaths.breath.features.feed')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/90">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{t('index.twoPaths.breath.features.diary')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/90">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{t('index.twoPaths.breath.features.navigator')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/90">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{t('index.twoPaths.breath.features.privateChats')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/90">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{t('index.twoPaths.breath.features.crisis')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/80">
                <MessageCircle className="w-4 h-4 text-emerald-400/70 flex-shrink-0" />
                <span>{t('index.twoPaths.breath.features.jivaIntro')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/80">
                <Palette className="w-4 h-4 text-emerald-400/70 flex-shrink-0" />
                <span>{t('index.twoPaths.breath.features.artTrial')}</span>
              </div>
            </div>
          </div>

          {/* CTA */}
          <Button
            type="button"
            onClick={() => openSignup("breath")}
            variant="ghost"
            className="w-full mt-2 py-5 text-base font-medium bg-transparent border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all"
          >
            {t('index.twoPaths.breath.cta')}
          </Button>
        </motion.div>

        {/* Anchor Card - Premium */}
        <motion.div
          id="anchor-plan"
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative scroll-mt-24 bg-gradient-to-br from-primary/20 via-purple-900/30 to-slate-900/40 backdrop-blur-xl rounded-3xl border border-primary/30 p-6 sm:p-8 shadow-[0_0_60px_rgba(120,146,255,0.15)]"
        >
          {/* Crown badge */}
          <div className="absolute -top-3 left-6 px-3 py-1 bg-primary/20 border border-primary/30 rounded-full flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">{t('index.twoPaths.anchor.price')}</span>
          </div>

          {/* Header */}
          <div className="flex items-center gap-3 mb-4 mt-2">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Anchor className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{t('index.twoPaths.anchor.name')}</h3>
              <p className="text-sm text-white/60">{t('index.twoPaths.anchor.essence')}</p>
            </div>
          </div>

          <p className="text-sm text-white/70 mb-3">{t('index.twoPaths.anchor.essenceDetail')}</p>

          {/* Includes-all banner */}
          <div className="mb-3 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-400/25 flex items-center gap-2">
            <Check className="w-4 h-4 text-amber-300 flex-shrink-0" />
            <span className="text-sm font-medium text-amber-200">
              {t('index.twoPaths.anchor.includesAll', 'Всё из «Дыхания» +')}
            </span>
          </div>

          {/* WHO IS WITH YOU — Jiva intro (moved up) */}
          <div className="mb-4 rounded-2xl bg-white/[0.03] border border-white/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-primary/70" />
              <span className="text-xs text-white/50 uppercase tracking-wide">{t('index.twoPaths.anchor.ai.title')}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-primary/30 rounded-full blur-md" />
                <img
                  src={jivaAvatar}
                  alt="Джива"
                  className="relative w-12 h-12 rounded-full object-cover border border-primary/40 shadow-[0_0_20px_rgba(120,146,255,0.4)]"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-white/90">{t('index.twoPaths.anchor.ai.name')}</p>
                <p className="text-xs text-white/50">{t('index.twoPaths.anchor.ai.desc')}</p>
              </div>
            </div>
            <div className="mt-3">
              <PoweredByClaude variant="light" />
            </div>
          </div>

          {/* Honest pricing & access summary */}
          <div className="mb-4 rounded-2xl bg-white/[0.03] border border-white/10 p-4 space-y-2">
            <p className="text-sm text-white/80 leading-relaxed">
              <span className="text-primary font-medium">10 сообщений Дживе в день</span> + память между сессиями.
            </p>
            <p className="text-sm text-white/80 leading-relaxed">
              Глубокая <span className="text-primary font-medium">арт-терапия без лимитов</span> и приоритетная поддержка.
            </p>
          </div>

          {/* Coffee price hint */}
          <div className="flex items-center gap-2 mb-5 px-3 py-2 rounded-full bg-amber-500/10 border border-amber-400/20 w-fit">
            <Coffee className="w-3.5 h-3.5 text-amber-300" />
            <span className="text-xs font-medium text-amber-300/90">
              {t('index.twoPaths.anchor.coffeePrice', 'Меньше 23 ₽ в день — дешевле кофе')}
            </span>
          </div>

          {/* Comparison rows */}
          <div className="space-y-0">
            <div className="py-3 border-b border-white/5">
              <div className="flex items-center gap-2 mb-1.5">
                <MessageCircle className="w-4 h-4 text-primary/70" />
                <span className="text-xs text-white/50 uppercase tracking-wide">{t('index.twoPaths.anchor.dialog.title')}</span>
              </div>
              <p className="text-sm font-medium text-white/90">{t('index.twoPaths.anchor.dialog.value')}</p>
              <ul className="mt-1 space-y-0.5">
                {(t('index.twoPaths.anchor.dialog.features') as unknown as string[])?.map?.((f: string, i: number) => (
                  <li key={i} className="text-xs text-white/50 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-primary" /> {f}
                  </li>
                )) || null}
              </ul>
            </div>

            <div className="py-3 border-b border-white/5">
              <div className="flex items-center gap-2 mb-1.5">
                <History className="w-4 h-4 text-primary/70" />
                <span className="text-xs text-white/50 uppercase tracking-wide">{t('index.twoPaths.anchor.memory.title')}</span>
              </div>
              <p className="text-sm font-medium text-white/90">{t('index.twoPaths.anchor.memory.value')}</p>
              <p className="text-xs text-white/50 mt-1">{t('index.twoPaths.anchor.memory.desc')}</p>
            </div>

            <div className="py-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Palette className="w-4 h-4 text-primary/70" />
                <span className="text-xs text-white/50 uppercase tracking-wide">{t('index.twoPaths.anchor.art.title')}</span>
              </div>
              <p className="text-sm font-medium text-white/90">{t('index.twoPaths.anchor.art.value')}</p>
              <p className="text-xs text-white/50 mt-1">{t('index.twoPaths.anchor.art.desc')}</p>
            </div>
          </div>

          {/* CTA - brightest gradient on the page */}
          <div className="mt-6 space-y-2">
            <Button
              type="button"
              onClick={() => openSignup("anchor")}
              className="group w-full py-6 text-base font-bold rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-500 hover:from-emerald-300 hover:via-cyan-300 hover:to-violet-400 text-white shadow-[0_0_60px_rgba(16,185,129,0.5)] hover:shadow-[0_0_80px_rgba(16,185,129,0.7)] border border-white/20 transition-all"
            >
              <span className="flex items-center justify-center gap-2">
                <Anchor className="w-5 h-5" />
                {t('index.twoPaths.anchor.cta')}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Button>
            <p className="text-center text-xs text-white/50">
              {t('index.twoPaths.anchor.cancelAnytime', 'Отмена в любой момент • Доступ до конца периода')}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Crisis note */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="mt-8 max-w-3xl xl:max-w-4xl mx-auto"
      >
        <Link 
          to="/crisis"
          className="block bg-gradient-to-r from-rose-500/10 to-pink-500/10 border border-rose-500/20 rounded-2xl p-5 text-center hover:border-rose-500/40 transition-all group"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Heart className="w-5 h-5 text-rose-400 group-hover:scale-110 transition-transform" fill="currentColor" />
            <span className="font-semibold text-white">{t('index.twoPaths.crisis.title')}</span>
          </div>
          <p className="text-sm text-white/60">{t('index.twoPaths.crisis.description')}</p>
        </Link>
      </motion.div>

      <QuickSignupModal open={signupOpen} onOpenChange={setSignupOpen} path={signupPath} />
    </section>
  );
};
