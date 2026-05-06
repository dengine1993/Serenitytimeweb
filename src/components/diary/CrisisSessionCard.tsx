import { format } from "date-fns";
import { ru, enUS } from "date-fns/locale";
import { motion } from "framer-motion";
import { Wind, Sprout, Phone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/hooks/useI18n";
import type { CrisisSession } from "@/hooks/useCrisisSessions";

interface CrisisSessionCardProps {
  session: CrisisSession;
  isLight?: boolean;
  showSmerCta?: boolean;
}

const intensityLabel = (intensity: string | null, t: (k: string) => string) => {
  if (!intensity) return t("crisis.journal.card.intensityNone");
  if (intensity === "high") return t("crisis.journal.card.intensityHigh");
  if (intensity === "medium") return t("crisis.journal.card.intensityMedium");
  if (intensity === "low") return t("crisis.journal.card.intensityLow");
  return t("crisis.journal.card.intensityNone");
};

const outcomeLabel = (outcome: string | null, t: (k: string) => string) => {
  if (!outcome) return t("crisis.journal.card.outcomeNone");
  if (outcome === "better") return t("crisis.journal.card.outcomeBetter");
  if (outcome === "same") return t("crisis.journal.card.outcomeSame");
  if (outcome === "worse") return t("crisis.journal.card.outcomeWorse");
  return t("crisis.journal.card.outcomeNone");
};

const techniqueIcon = (tech: string) => {
  switch (tech) {
    case "breathing":
      return <Wind className="w-3.5 h-3.5" />;
    case "grounding":
      return <Sprout className="w-3.5 h-3.5" />;
    case "hotline":
      return <Phone className="w-3.5 h-3.5" />;
    default:
      return null;
  }
};

const techniqueLabel = (tech: string, t: (k: string) => string) => {
  if (tech === "breathing") return t("crisis.journal.card.techBreathing");
  if (tech === "grounding") return t("crisis.journal.card.techGrounding");
  if (tech === "hotline") return t("crisis.journal.card.techHotline");
  return tech;
};

export function CrisisSessionCard({ session, isLight = false }: CrisisSessionCardProps) {
  const { language, t } = useI18n();
  const locale = language === "ru" ? ru : enUS;
  const created = new Date(session.created_at);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card
        className={`p-4 rounded-2xl ${
          isLight
            ? "bg-white/80 border-orange-100/60 shadow-sm"
            : "bg-white/5 border-white/10 backdrop-blur-sm"
        }`}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg leading-none">🆘</span>
            <span className={`text-xs font-medium ${isLight ? "text-gray-600" : "text-white/70"}`}>
              {format(created, "d MMM · HH:mm", { locale })}
            </span>
          </div>
          <span
            className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
              isLight ? "bg-orange-50 text-orange-600" : "bg-orange-500/15 text-orange-300"
            }`}
          >
            SOS
          </span>
        </div>

        <div className={`text-sm mb-2 ${isLight ? "text-gray-700" : "text-white/80"}`}>
          <span className="font-medium">{t("crisis.journal.card.anxiety")} </span>
          {intensityLabel(session.intensity, t)}
        </div>

        {session.techniques_used && session.techniques_used.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <span className={`text-xs ${isLight ? "text-gray-500" : "text-white/60"}`}>
              {t("crisis.journal.card.helped")}
            </span>
            {session.techniques_used.map((tech) => (
              <span
                key={tech}
                className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                  isLight ? "bg-emerald-50 text-emerald-700" : "bg-emerald-500/15 text-emerald-300"
                }`}
              >
                {techniqueIcon(tech)}
                {techniqueLabel(tech, t)}
              </span>
            ))}
          </div>
        )}

        <div className={`text-sm ${isLight ? "text-gray-700" : "text-white/80"}`}>
          <span className="font-medium">{t("crisis.journal.card.result")} </span>
          {outcomeLabel(session.outcome, t)}
        </div>

      </Card>
    </motion.div>
  );
}
