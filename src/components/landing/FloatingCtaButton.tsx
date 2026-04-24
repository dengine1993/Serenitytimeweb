import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

interface FloatingCtaButtonProps {
  showAfter?: number;
}

export const FloatingCtaButton = ({ showAfter = 400 }: FloatingCtaButtonProps) => {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const [nearFooter, setNearFooter] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > showAfter);
      const scrollBottom = window.innerHeight + window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      setNearFooter(docHeight - scrollBottom < 120);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [showAfter]);

  return (
    <AnimatePresence>
      {visible && !nearFooter && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 22 }}
          className="fixed bottom-6 right-6 z-40"
        >
          <Link
            to="/auth"
            aria-label={t("index.stickyBar.cta", "Войти бесплатно")}
            className="group relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-[0_8px_30px_rgba(16,185,129,0.55)] border border-emerald-300/40 hover:shadow-[0_8px_40px_rgba(16,185,129,0.8)] transition-shadow"
          >
            <motion.span
              className="absolute inset-0 rounded-full bg-emerald-400/40"
              animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            />
            <ArrowRight className="relative w-7 h-7" />
            <span className="pointer-events-none absolute right-full mr-3 px-3 py-1.5 rounded-full bg-slate-900/95 border border-white/10 text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
              {t("index.stickyBar.fabTooltip", "Начать")}
            </span>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
