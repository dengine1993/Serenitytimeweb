import { motion } from "framer-motion";
import { Ear, Brain, Heart } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import jivaAvatar from "@/assets/jiva.png";

/**
 * Знакомство с Дживой — идёт сразу после hero.
 * До этого блока бренд «Восход» нигде не упоминает Дживу — это её первое появление.
 */
export const MeetJiva = () => {
  const { t } = useI18n();

  const qualities = [
    { icon: Ear, key: "index.meetJiva.qualities.listens" },
    { icon: Brain, key: "index.meetJiva.qualities.remembers" },
    { icon: Heart, key: "index.meetJiva.qualities.stays" },
  ];

  return (
    <section className="w-full px-4 sm:px-8 lg:px-16 py-14 sm:py-20">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-3xl mx-auto text-center"
      >
        {/* Eyebrow */}
        <p className="text-[11px] uppercase tracking-[0.2em] text-rose-300/80 mb-5">
          {t("index.meetJiva.eyebrow")}
        </p>

        {/* Avatar with glow */}
        <div className="relative inline-block mb-6">
          <div className="absolute inset-0 bg-rose-400/30 rounded-full blur-2xl scale-150" />
          <img
            src={jivaAvatar}
            alt="Jiva"
            className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border border-rose-300/40 shadow-[0_0_40px_rgba(251,113,133,0.45)]"
          />
        </div>

        {/* Title */}
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
          {t("index.meetJiva.title")}
        </h2>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-white/75 leading-relaxed max-w-xl mx-auto mb-8">
          {t("index.meetJiva.subtitle")}
        </p>

        {/* Three qualities — minimal pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {qualities.map(({ icon: Icon, key }) => (
            <span
              key={key}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-sm text-white/80"
            >
              <Icon className="w-3.5 h-3.5 text-rose-300" />
              {t(key)}
            </span>
          ))}
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-white/45 max-w-md mx-auto leading-relaxed">
          {t("index.meetJiva.disclaimer")}
        </p>
      </motion.div>
    </section>
  );
};
