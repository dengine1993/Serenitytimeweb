import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sunrise, BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";

const STORAGE_KEY = "sunrise_intro_seen_v1";

export function SunriseIntroModal() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(STORAGE_KEY)) {
      // small delay so it doesn't compete with route transition
      const id = setTimeout(() => setOpen(true), 250);
      return () => clearTimeout(id);
    }
  }, []);

  const close = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="relative w-full max-w-md rounded-3xl overflow-hidden border border-amber-300/25 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-rose-500/15 backdrop-blur-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ambient glow */}
            <div className="pointer-events-none absolute -top-24 -right-16 w-64 h-64 rounded-full bg-amber-400/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-16 w-56 h-56 rounded-full bg-rose-500/20 blur-3xl" />

            <div className="relative p-6 sm:p-7">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-500/25 flex items-center justify-center">
                  <Sunrise className="w-5 h-5 text-amber-200" />
                </div>
                <span className="text-[11px] uppercase tracking-[0.18em] text-amber-300/90 font-semibold">
                  {t("stories.intro.subtitle")}
                </span>
              </div>

              <h2 className="text-2xl sm:text-[26px] font-bold leading-tight text-foreground mb-5">
                {t("stories.intro.title")}
              </h2>

              <div className="space-y-3 mb-6">
                <div className="flex gap-3 p-3 rounded-2xl bg-background/40 border border-border/40">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400/30 to-rose-400/20 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-amber-200" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">
                      {t("stories.intro.myTitle")}
                    </div>
                    <div className="text-[13px] text-muted-foreground leading-relaxed mt-0.5">
                      {t("stories.intro.myDesc")}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 p-3 rounded-2xl bg-background/40 border border-border/40">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400/30 to-amber-300/20 flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4 text-amber-200" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">
                      {t("stories.intro.othersTitle")}
                    </div>
                    <div className="text-[13px] text-muted-foreground leading-relaxed mt-0.5">
                      {t("stories.intro.othersDesc")}
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={close}
                size="lg"
                className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white font-semibold border-0 hover:opacity-95"
              >
                {t("stories.intro.cta")}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
