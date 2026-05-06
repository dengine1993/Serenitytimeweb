import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import jivaLogo from "@/assets/jiva.png";
import { X } from "lucide-react";

const HIDDEN_ROUTES = new Set([
  "/",
  "/auth",
  "/auth/callback",
  "/email-confirmed",
  "/ai-chat",
  "/crisis",
  "/breathing-exercise",
  "/grounding-exercise",
]);

export function JivaFloatingButton() {
  const { user } = useAuth();
  const location = useLocation();
  const { language } = useI18n();
  const [tooltipOpen, setTooltipOpen] = useState(false);

  if (!user) return null;
  if (HIDDEN_ROUTES.has(location.pathname)) return null;
  if (location.pathname.startsWith("/admin")) return null;

  const isEn = language === "en";
  const tooltip = isEn
    ? "When it's hard, anxious or you just need to talk"
    : "Когда тревожно, паника или просто хочется поговорить";
  const disclaimer = isEn
    ? "AI companion · Does not replace a doctor"
    : "ИИ-собеседник • Не заменяет врача";
  const ariaLabel = isEn ? "Write to Jiva" : "Написать Дживе";

  return (
    <div className="fixed bottom-24 right-4 z-40 flex flex-col items-end gap-2 pointer-events-none">
      <AnimatePresence>
        {tooltipOpen && (
          <motion.div
            initial={{ opacity: 0, x: 10, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 10, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-auto max-w-[240px] rounded-xl bg-slate-900/95 border border-emerald-400/30 px-3 py-2 text-xs text-white shadow-xl flex items-start gap-2"
          >
            <div className="flex-1 space-y-1">
              <p className="leading-snug">{tooltip}</p>
              <p className="text-[10px] text-white/40 leading-snug">{disclaimer}</p>
            </div>
            <button
              onClick={() => setTooltipOpen(false)}
              className="text-white/50 hover:text-white shrink-0"
              aria-label={isEn ? "Close" : "Закрыть"}
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Link
        to="/ai-chat"
        aria-label={ariaLabel}
        onMouseEnter={() => setTooltipOpen(true)}
        onMouseLeave={() => setTooltipOpen(false)}
        onFocus={() => setTooltipOpen(true)}
        onBlur={() => setTooltipOpen(false)}
        onClick={() => setTooltipOpen(false)}
        className="pointer-events-auto relative block"
      >
        <span className="absolute inset-0 rounded-full bg-emerald-400/40 blur-md animate-pulse" />
        <span className="absolute -inset-1 rounded-full bg-gradient-to-br from-emerald-400/30 to-teal-400/20 animate-ping" />
        <img
          src={jivaLogo}
          alt=""
          aria-hidden="true"
          className="relative w-14 h-14 rounded-full object-cover border-2 border-emerald-400/60 shadow-[0_0_20px_rgba(16,185,129,0.5)] active:scale-95 transition-transform"
        />
      </Link>
    </div>
  );
}
