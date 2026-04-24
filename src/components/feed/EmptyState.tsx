import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/hooks/useI18n";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface EmptyStateProps {
  onPrimary: () => void;
  onSecondary: () => void;
}

export const EmptyState = ({ onPrimary, onSecondary }: EmptyStateProps) => {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <Card className="relative overflow-hidden rounded-3xl border border-white/12 bg-slate-900/70 p-10 text-center text-white">
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(167,139,250,0.18), transparent 65%), radial-gradient(circle at 10% 80%, rgba(56,189,248,0.12), transparent 60%)",
        }}
        animate={{ opacity: [0.45, 0.7, 0.45] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden="true"
      />
      <motion.div
        className="absolute left-1/2 top-6 -translate-x-1/2"
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 48, repeat: Infinity, ease: "linear" }}
        aria-hidden="true"
      >
        <div className="h-16 w-16 rounded-full bg-violet-400/25 blur-2xl" />
      </motion.div>
      <div className="relative z-10 mx-auto flex max-w-md flex-col items-center gap-5">
        <div className="relative">
          <Sparkles className="h-12 w-12 text-primary/80" />
          <motion.span
            className="absolute -inset-3 rounded-full border border-violet-300/25"
            animate={{ opacity: [0.4, 0.75, 0.4], scale: [0.95, 1.05, 0.95] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden="true"
          />
        </div>
        <div className="space-y-3 text-white">
          <h2 className="text-xl font-semibold text-white/95">
            {t("feed.empty.title")}
          </h2>
          <p className="text-sm text-white/75 max-w-sm mx-auto">
            {t("feed.empty.desc")}
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            onClick={onPrimary}
            className="w-full rounded-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-300 px-6 py-2.5 text-sm text-white shadow-[0_20px_55px_rgba(167,139,250,0.35)] sm:w-auto"
          >
            {t("feed.empty.primary")}
          </Button>
          <Button
            variant="ghost"
            onClick={onSecondary}
            className="w-full rounded-full border border-primary/20 bg-primary/5 px-6 py-2.5 text-sm hover:bg-primary/10 sm:w-auto group"
          >
            <Sparkles className="h-4 w-4 mr-2 group-hover:animate-pulse" />
            {t("feed.empty.secondary")}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default EmptyState;
