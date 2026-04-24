import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";
import logoImage from "@/assets/logo-bezm.png";

interface StickyCtaBarProps {
  threshold?: number;
}

export const StickyCtaBar = ({ threshold = 600 }: StickyCtaBarProps) => {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > threshold);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed top-0 inset-x-0 z-40 bg-[#0A0F18]/85 backdrop-blur-xl border-b border-white/10"
        >
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative w-8 h-8 flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/30 to-violet-500/30 rounded-full blur-md" />
                <img
                  src={logoImage}
                  alt="Безмятежные"
                  className="relative w-full h-full object-contain rounded-full"
                />
              </div>
              <span className="text-sm font-medium text-white/90 truncate hidden xs:inline sm:inline">
                {t("index.hero.brandName", "Безмятежные")}
              </span>
            </div>
            <Link to="/auth" className="flex-shrink-0">
              <Button
                size="sm"
                className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] border border-emerald-400/30 px-4 sm:px-5 text-xs sm:text-sm font-semibold"
              >
                {t("index.stickyBar.cta", "Войти бесплатно")}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
