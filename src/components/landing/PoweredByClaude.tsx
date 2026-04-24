import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";

interface PoweredByClaudeProps {
  /** "light" — для тёмного фона лендинга, "muted" — для светлого фона приложения */
  variant?: "light" | "muted";
  className?: string;
}

/**
 * Тонкий бейдж: «Работает на Claude Sonnet 4.6 от Anthropic».
 * Используется в карточках Дживы — лендинг, Premium, AiChat header.
 */
export const PoweredByClaude = ({ variant = "light", className }: PoweredByClaudeProps) => {
  const { language } = useI18n();
  const isEn = language === "en";

  const label = isEn
    ? "Powered by Claude Sonnet 4.6 · Anthropic"
    : "Работает на Claude Sonnet 4.6 от Anthropic";

  const styles =
    variant === "light"
      ? "border-white/15 bg-white/5 text-white/70 hover:border-white/30 hover:text-white/90"
      : "border-border/60 bg-muted/40 text-muted-foreground hover:border-border";

  return (
    <motion.span
      initial={{ opacity: 0, y: 4 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide transition-colors",
        styles,
        className,
      )}
      aria-label={label}
    >
      <Sparkles className="h-3 w-3" aria-hidden />
      <span>{label}</span>
    </motion.span>
  );
};

export default PoweredByClaude;
