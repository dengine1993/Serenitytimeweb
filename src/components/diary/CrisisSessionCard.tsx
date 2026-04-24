import { format } from "date-fns";
import { ru, enUS } from "date-fns/locale";
import { motion } from "framer-motion";
import { Brain, ArrowRight, Wind, Sprout, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";
import type { CrisisSession } from "@/hooks/useCrisisSessions";

interface CrisisSessionCardProps {
  session: CrisisSession;
  isLight?: boolean;
  showSmerCta?: boolean;
}

const intensityLabel = (intensity: string | null, lang: string) => {
  if (lang === "ru") {
    return intensity === "high" ? "сильная" : intensity === "medium" ? "умеренная" : intensity === "low" ? "лёгкая" : "—";
  }
  return intensity === "high" ? "high" : intensity === "medium" ? "moderate" : intensity === "low" ? "mild" : "—";
};

const outcomeLabel = (outcome: string | null, lang: string) => {
  if (lang === "ru") {
    return outcome === "better" ? "лучше ✓" : outcome === "same" ? "так же" : outcome === "worse" ? "тяжелее" : "—";
  }
  return outcome === "better" ? "better ✓" : outcome === "same" ? "same" : outcome === "worse" ? "worse" : "—";
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

const techniqueLabel = (tech: string, lang: string) => {
  if (lang === "ru") {
    if (tech === "breathing") return "дыхание";
    if (tech === "grounding") return "заземление";
    if (tech === "hotline") return "горячая линия";
    return tech;
  }
  if (tech === "breathing") return "breathing";
  if (tech === "grounding") return "grounding";
  if (tech === "hotline") return "hotline";
  return tech;
};

export function CrisisSessionCard({ session, isLight = false, showSmerCta = true }: CrisisSessionCardProps) {
  const navigate = useNavigate();
  const { language } = useI18n();
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
            {language === "ru" ? "SOS" : "SOS"}
          </span>
        </div>

        <div className={`text-sm mb-2 ${isLight ? "text-gray-700" : "text-white/80"}`}>
          <span className="font-medium">{language === "ru" ? "Тревога: " : "Anxiety: "}</span>
          {intensityLabel(session.intensity, language)}
        </div>

        {session.techniques_used && session.techniques_used.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <span className={`text-xs ${isLight ? "text-gray-500" : "text-white/60"}`}>
              {language === "ru" ? "Помогло:" : "Helped:"}
            </span>
            {session.techniques_used.map((tech) => (
              <span
                key={tech}
                className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                  isLight ? "bg-emerald-50 text-emerald-700" : "bg-emerald-500/15 text-emerald-300"
                }`}
              >
                {techniqueIcon(tech)}
                {techniqueLabel(tech, language)}
              </span>
            ))}
          </div>
        )}

        <div className={`text-sm ${isLight ? "text-gray-700" : "text-white/80"}`}>
          <span className="font-medium">{language === "ru" ? "Стало: " : "Result: "}</span>
          {outcomeLabel(session.outcome, language)}
        </div>

        {showSmerCta && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/smer")}
            className={`mt-3 -ml-2 gap-1.5 text-xs ${
              isLight ? "text-violet-600 hover:bg-violet-50" : "text-violet-300 hover:bg-violet-500/10"
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            {language === "ru" ? "Разобрать через СМЭР" : "Analyze with SMER"}
            <ArrowRight className="w-3 h-3" />
          </Button>
        )}
      </Card>
    </motion.div>
  );
}
