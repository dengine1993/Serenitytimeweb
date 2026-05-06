import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, Sparkles, Brain, MessageCircle, History, Palette, Crown, Coffee, Check, ArrowRight, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";
import { QuickSignupModal } from "@/components/landing/QuickSignupModal";
import jivaAvatar from "@/assets/jiva.png";

type Path = "free" | "premium";

export const TwoPathsSection = () => {
  const { t } = useI18n();
  const [signupOpen, setSignupOpen] = useState(false);
  const [signupPath, setSignupPath] = useState<Path>("free");

  const openSignup = (path: Path) => {
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
        className="text-center mb-10 max-w-2xl mx-auto"
      >
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
          {t('index.twoPaths.title')}
        </h2>
        <p className="text-base text-white/65">
          {t('index.twoPaths.subtitle')}
        </p>
      </motion.div>

      {/* Two Cards */}
      <div className="grid md:grid-cols-2 gap-6 lg:gap-8 xl:gap-12">

        {/* FREE — Jiva Fast */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative bg-gradient-to-br from-slate-900/60 via-slate-900/40 to-slate-900/30 backdrop-blur-xl rounded-3xl border border-white/10 p-6 sm:p-8"
        >
          <div className="absolute -top-3 left-6 px-3 py-1 bg-white/10 border border-white/20 rounded-full">
            <span className="text-xs font-medium text-white/80">{t('index.twoPaths.free.price')}</span>
          </div>

          <div className="flex items-center gap-3 mb-4 mt-2">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white/80" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{t('index.twoPaths.free.name')}</h3>
              <p className="text-sm text-white/60">{t('index.twoPaths.free.essence')}</p>
            </div>
          </div>

          <p className="text-sm text-white/70 mb-4">{t('index.twoPaths.free.essenceDetail')}</p>

          {/* Gift banner — 15 deep messages on signup */}
          <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-400/25">
            <Gift className="w-4 h-4 text-rose-300 flex-shrink-0" />
            <span className="text-sm text-rose-100/90">
              {t('index.twoPaths.free.giftBanner')}
            </span>
          </div>

          <div className="bg-white/5 rounded-xl p-4 mb-4 border border-white/10">
            <p className="text-xs text-white/60 uppercase tracking-wide mb-2 font-medium">
              {t('index.twoPaths.free.includesTitle')}
            </p>
            <div className="space-y-2">
              <FeatureRow text={t('index.twoPaths.free.features.community')} />
              <FeatureRow text={t('index.twoPaths.free.features.feed')} />
              <FeatureRow text={t('index.twoPaths.free.features.diary')} />
              <FeatureRow text={t('index.twoPaths.free.features.privateChats')} />
              <FeatureRow text={t('index.twoPaths.free.features.jivaIntro')} icon={MessageCircle} />
              <FeatureRow text={t('index.twoPaths.free.features.artTrial')} icon={Palette} />
            </div>
          </div>

          <Button
            type="button"
            onClick={() => openSignup("free")}
            variant="ghost"
            className="w-full mt-2 py-5 text-base font-medium bg-transparent border border-white/20 text-white/90 hover:bg-white/10 hover:border-white/30 transition-all"
          >
            {t('index.twoPaths.free.cta')}
          </Button>
        </motion.div>

        {/* PREMIUM — Jiva Deep */}
        <motion.div
          id="premium-plan"
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative scroll-mt-24 bg-gradient-to-br from-rose-600/20 via-pink-900/30 to-slate-900/40 backdrop-blur-xl rounded-3xl border border-rose-400/35 p-6 sm:p-8 shadow-[0_0_60px_rgba(251,113,133,0.18)]"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-rose-500/15 to-transparent rounded-t-3xl" />

          <div className="relative">
            <div className="absolute -top-6 left-0 px-3 py-1 bg-rose-500/25 border border-rose-400/40 rounded-full flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-rose-200" />
              <span className="text-xs font-medium text-rose-100">{t('index.twoPaths.premium.price')}</span>
            </div>

            <div className="flex items-center gap-3 mb-4 mt-2">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-400/40 flex items-center justify-center shadow-[0_0_20px_rgba(251,113,133,0.35)]">
                <Sparkles className="w-6 h-6 text-rose-200" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{t('index.twoPaths.premium.name')}</h3>
                <p className="text-sm text-white/60">{t('index.twoPaths.premium.essence')}</p>
              </div>
            </div>

            <p className="text-sm text-white/75 mb-3">{t('index.twoPaths.premium.essenceDetail')}</p>

            {/* Includes-all banner */}
            <div className="mb-3 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-400/25 flex items-center gap-2">
              <Check className="w-4 h-4 text-amber-300 flex-shrink-0" />
              <span className="text-sm font-medium text-amber-200">
                {t('index.twoPaths.premium.includesAll')}
              </span>
            </div>

            {/* Jiva Deep introduction */}
            <div className="mb-4 rounded-2xl bg-white/[0.04] border border-white/10 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-rose-300" />
                <span className="text-xs text-white/50 uppercase tracking-wide">
                  {t('index.twoPaths.premium.ai.title')}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 bg-rose-400/30 rounded-full blur-md" />
                  <img
                    src={jivaAvatar}
                    alt="Джива"
                    className="relative w-12 h-12 rounded-full object-cover border border-rose-300/50 shadow-[0_0_20px_rgba(251,113,133,0.4)]"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-white/90">{t('index.twoPaths.premium.ai.name')}</p>
                  <p className="text-xs text-rose-200/70">{t('index.twoPaths.premium.ai.model')}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-white/65 leading-relaxed">
                {t('index.twoPaths.premium.ai.desc')}
              </p>
            </div>

            {/* Headline value */}
            <div className="mb-4 rounded-2xl bg-white/[0.04] border border-white/10 p-4 space-y-2">
              <p className="text-sm text-white/85 leading-relaxed">
                <span className="text-rose-200 font-semibold">{t('index.twoPaths.premium.dialog.value')}</span>
                {' — '}
                {t('index.twoPaths.premium.dialog.tail')}
              </p>
              <p className="text-sm text-white/85 leading-relaxed">
                <span className="text-rose-200 font-semibold">{t('index.twoPaths.premium.art.value')}</span>
                {' — '}
                {t('index.twoPaths.premium.art.desc')}
              </p>
            </div>

            <div className="flex items-center gap-2 mb-5 px-3 py-2 rounded-full bg-amber-500/10 border border-amber-400/20 w-fit">
              <Coffee className="w-3.5 h-3.5 text-amber-300" />
              <span className="text-xs font-medium text-amber-300/90">
                {t('index.twoPaths.premium.coffeePrice')}
              </span>
            </div>

            {/* Comparison rows */}
            <div className="space-y-0">
              <Row icon={MessageCircle} title={t('index.twoPaths.premium.dialog.title')} value={t('index.twoPaths.premium.dialog.value')} />
              <Row icon={History} title={t('index.twoPaths.premium.memory.title')} value={t('index.twoPaths.premium.memory.value')} desc={t('index.twoPaths.premium.memory.desc')} />
              <Row icon={Palette} title={t('index.twoPaths.premium.art.title')} value={t('index.twoPaths.premium.art.value')} last />
            </div>

            {/* CTA */}
            <div className="mt-6 space-y-2">
              <Button
                type="button"
                onClick={() => openSignup("premium")}
                className="group w-full py-6 text-base font-bold rounded-full bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500 hover:from-rose-400 hover:via-pink-400 hover:to-rose-400 text-white shadow-[0_0_50px_rgba(251,113,133,0.45)] hover:shadow-[0_0_70px_rgba(251,113,133,0.65)] border border-rose-300/30 transition-all"
              >
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  {t('index.twoPaths.premium.cta')}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </Button>
              <p className="text-center text-xs text-white/50">
                {t('index.twoPaths.premium.cancelAnytime')}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      <QuickSignupModal open={signupOpen} onOpenChange={setSignupOpen} path={signupPath} />
    </section>
  );
};

const FeatureRow = ({ text, icon: Icon = Check }: { text: string; icon?: typeof Check }) => (
  <div className="flex items-center gap-2 text-sm text-white/85">
    <Icon className="w-4 h-4 text-white/60 flex-shrink-0" />
    <span>{text}</span>
  </div>
);

const Row = ({
  icon: Icon,
  title,
  value,
  desc,
  last = false,
}: {
  icon: typeof MessageCircle;
  title: string;
  value: string;
  desc?: string;
  last?: boolean;
}) => (
  <div className={`py-3 ${last ? '' : 'border-b border-white/5'}`}>
    <div className="flex items-center gap-2 mb-1.5">
      <Icon className="w-4 h-4 text-rose-300/80" />
      <span className="text-xs text-white/50 uppercase tracking-wide">{title}</span>
    </div>
    <p className="text-sm font-medium text-white/90">{value}</p>
    {desc && <p className="text-xs text-white/55 mt-1">{desc}</p>}
  </div>
);
