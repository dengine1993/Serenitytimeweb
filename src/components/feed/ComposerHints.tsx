import { useI18n } from "@/hooks/useI18n";

interface ComposerHintsProps {
  showOnline: boolean;
  onlineCount?: number | null;
  showSuggestion: boolean;
  suggestionCount?: number | null;
}

export const ComposerHints = ({
  showOnline,
  onlineCount,
  showSuggestion,
  suggestionCount,
}: ComposerHintsProps) => {
  const { t } = useI18n();

  const canShowOnline = showOnline && typeof onlineCount === "number" && onlineCount > 10;
  const canShowSuggestion = showSuggestion && typeof suggestionCount === "number" && suggestionCount > 0;

  if (!canShowOnline && !canShowSuggestion) {
    return (
      <p className="text-xs text-white/65">{t("feed.composer.example")}</p>
    );
  }

  return (
    <div className="space-y-1 text-xs text-white/65">
      <p>{t("feed.composer.example")}</p>
      {canShowOnline && (
        <p className="text-white/55">{t("feed.composer.online", { count: onlineCount })}</p>
      )}
      {canShowSuggestion && (
        <p className="text-white/55">{t("feed.composer.suggestion", { answers: suggestionCount })}</p>
      )}
    </div>
  );
};

export default ComposerHints;
