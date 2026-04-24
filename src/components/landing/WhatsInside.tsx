import { motion } from "framer-motion";
import { BookHeart, MessageCircle, Phone, Wind, NotebookPen, Brain, Palette, Newspaper, Users, Hand, Compass, Crown, ArrowRight } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import jivaAvatar from "@/assets/jiva.png";

type Tier = {
  key: string;
  accent: "rose" | "emerald" | "violet";
  titleKey: string;
  subtitleKey: string;
  items: { icon: typeof Wind; key: string }[];
  footnoteKey?: string;
};

const TIERS: Tier[] = [
  {
    key: "now",
    accent: "rose",
    titleKey: "index.whatsInside.now.title",
    subtitleKey: "index.whatsInside.now.subtitle",
    items: [
      { icon: Wind, key: "index.whatsInside.now.items.0" },
      { icon: Hand, key: "index.whatsInside.now.items.1" },
    ],
    footnoteKey: "index.whatsInside.now.footnote",
  },
  {
    key: "explore",
    accent: "emerald",
    titleKey: "index.whatsInside.explore.title",
    subtitleKey: "index.whatsInside.explore.subtitle",
    items: [
      { icon: NotebookPen, key: "index.whatsInside.explore.items.0" },
      { icon: Brain, key: "index.whatsInside.explore.items.1" },
      { icon: Compass, key: "index.whatsInside.explore.items.2" },
      { icon: Palette, key: "index.whatsInside.explore.items.3" },
    ],
  },
  {
    key: "talk",
    accent: "violet",
    titleKey: "index.whatsInside.talk.title",
    subtitleKey: "index.whatsInside.talk.subtitle",
    items: [
      { icon: Newspaper, key: "index.whatsInside.talk.items.0" },
      { icon: MessageCircle, key: "index.whatsInside.talk.items.1" },
      { icon: Users, key: "index.whatsInside.talk.items.2" },
    ],
  },
];

const ACCENTS: Record<string, { border: string; bg: string; icon: string; text: string; glow: string }> = {
  rose: {
    border: "border-rose-500/25",
    bg: "bg-rose-500/10",
    icon: "text-rose-300",
    text: "text-rose-300/90",
    glow: "from-rose-500/20 to-transparent",
  },
  emerald: {
    border: "border-emerald-500/25",
    bg: "bg-emerald-500/10",
    icon: "text-emerald-300",
    text: "text-emerald-300/90",
    glow: "from-emerald-500/20 to-transparent",
  },
  violet: {
    border: "border-violet-500/25",
    bg: "bg-violet-500/10",
    icon: "text-violet-300",
    text: "text-violet-300/90",
    glow: "from-violet-500/20 to-transparent",
  },
};

export const WhatsInside = () => {
  const { t } = useI18n();

  return (
    <section className="w-full px-4 sm:px-8 lg:px-16 xl:px-24 2xl:px-32 py-12 sm:py-20">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-10 max-w-3xl mx-auto"
      >
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3">
          {t("index.whatsInside.title", "Три уровня помощи — выбирай по состоянию")}
        </h2>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-5 lg:gap-6 max-w-6xl mx-auto">
        {TIERS.map((tier, idx) => {
          const Accent = ACCENTS[tier.accent];
          const isSos = tier.key === "now";
          return (
            <motion.div
              key={tier.key}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.08 }}
              className={`relative rounded-3xl bg-white/[0.03] border ${Accent.border} p-6 sm:p-7 backdrop-blur-sm overflow-hidden`}
            >
              <div className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${Accent.glow}`} />
              <div className="relative">
                {isSos ? (
                  <span className="inline-flex items-center justify-center px-3 h-12 min-w-[64px] rounded-xl text-base font-extrabold tracking-widest text-white bg-red-600 shadow-[0_0_16px_rgba(239,68,68,0.55)] mb-4">
                    SOS
                  </span>
                ) : (
                  <div className={`w-12 h-12 rounded-2xl ${Accent.bg} border ${Accent.border} flex items-center justify-center mb-4`}>
                    {tier.key === "explore" ? (
                      <BookHeart className={`w-6 h-6 ${Accent.icon}`} />
                    ) : (
                      <MessageCircle className={`w-6 h-6 ${Accent.icon}`} />
                    )}
                  </div>
                )}
                <h3 className="text-lg sm:text-xl font-bold text-white mb-1">
                  {t(tier.titleKey)}
                </h3>
                <p className={`text-xs uppercase tracking-wider mb-4 ${Accent.text}`}>
                  {t(tier.subtitleKey)}
                </p>

                <ul className="space-y-3">
                  {tier.items.map((item, i) => {
                    const ItemIcon = item.icon;
                    return (
                      <li key={i} className="flex items-start gap-3">
                        <ItemIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${Accent.icon}`} />
                        <span className="text-sm text-white/80 leading-snug">
                          {t(item.key)}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {tier.key === "talk" && (
                  <div className="mt-5 rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-transparent p-4">
                    <div className="flex items-start gap-3">
                      <img
                        src={jivaAvatar}
                        alt="Jiva"
                        className="w-12 h-12 rounded-full object-cover border border-violet-400/40 shadow-[0_0_20px_rgba(167,139,250,0.45)] flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-white">
                            {t("index.whatsInside.talk.jiva.title")}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-violet-200 bg-violet-500/20 border border-violet-400/30">
                            <Crown className="w-2.5 h-2.5" />
                            {t("index.whatsInside.talk.jiva.badge")}
                          </span>
                        </div>
                        <p className="text-[11px] text-violet-300/80 font-mono">
                          {t("index.whatsInside.talk.jiva.model")}
                        </p>
                      </div>
                    </div>
                    <ul className="mt-3 space-y-1.5">
                      <li className="text-xs text-white/80 leading-snug">• {t("index.whatsInside.talk.jiva.limit")}</li>
                      <li className="text-xs text-white/80 leading-snug">• {t("index.whatsInside.talk.jiva.tone")}</li>
                    </ul>
                    <p className="mt-3 pt-3 border-t border-violet-400/15 text-[11px] leading-relaxed text-white/55">
                      {t("index.whatsInside.talk.jiva.why")}
                    </p>
                    <a
                      href="#anchor-plan"
                      className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-violet-300 hover:text-violet-200 transition-colors"
                    >
                      {t("index.whatsInside.talk.jiva.cta")}
                      <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {tier.footnoteKey && (
                  <p className="mt-4 pt-4 border-t border-white/5 text-xs italic text-white/50">
                    {t(tier.footnoteKey)}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

    </section>
  );
};
