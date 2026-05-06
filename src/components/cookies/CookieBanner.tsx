import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";
import {
  rejectOptional,
  hasDecision,
  onChange,
} from "@/lib/cookieConsent";

/**
 * Упрощённый баннер cookies (152-ФЗ, ст.18.1).
 * Сервис использует только технически необходимые cookies — отдельного согласия они не требуют,
 * но мы информируем пользователя и фиксируем факт ознакомления.
 */
export function CookieBanner() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!hasDecision());
    const unsub = onChange((c) => setVisible(c === null));
    return unsub;
  }, []);

  const handleAck = () => {
    // Записываем «только необходимые» — отказ от опциональных категорий
    rejectOptional();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 120, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 120, opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4 md:p-6 pointer-events-none"
        role="dialog"
        aria-modal="false"
        aria-label={t("cookies.banner.aria", "Информация о файлах cookie")}
      >
        <div className="mx-auto max-w-2xl pointer-events-auto">
          <div
            className="rounded-2xl border border-amber-400/20 bg-[#0F1117]/95 backdrop-blur-xl shadow-2xl shadow-black/40 p-4 sm:p-5"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="shrink-0 w-9 h-9 rounded-xl bg-amber-400/15 flex items-center justify-center">
                <Cookie className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm sm:text-base font-semibold text-white mb-1">
                  {t("cookies.banner.title", "Файлы cookie")}
                </h2>
                <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
                  {t(
                    "cookies.banner.text",
                    "Мы используем только технически необходимые cookies для работы сервиса (авторизация, сессия, безопасность). Сторонние и аналитические cookies не применяются."
                  )}{" "}
                  <Link
                    to="/cookies"
                    className="text-amber-400 underline underline-offset-2 hover:text-amber-300"
                  >
                    {t("cookies.banner.learnMore", "Подробнее")}
                  </Link>
                </p>
              </div>
            </div>

            <Button
              onClick={handleAck}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-medium"
            >
              {t("cookies.banner.understood", "Понятно")}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
