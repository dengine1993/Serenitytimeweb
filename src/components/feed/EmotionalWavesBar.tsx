import { useCallback } from "react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";

export type EmotionalWaveDefinition = {
  id: string;
  emoji: string;
  labelKey: string;
  tint: string;
  accentFrom?: string;
  accentTo?: string;
};

interface EmotionalWavesBarProps {
  waves: EmotionalWaveDefinition[];
  activeWaveId: string;
  suggestedWaveId?: string | null;
  onSelect: (waveId: string) => void;
}

export const EmotionalWavesBar = ({
  waves,
  activeWaveId,
  suggestedWaveId,
  onSelect,
}: EmotionalWavesBarProps) => {
  const { t } = useI18n();

  const handleSelect = useCallback(
    (waveId: string) => {
      onSelect(waveId);
      if (typeof window !== "undefined") {
        window.requestAnimationFrame(() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      }
    },
    [onSelect],
  );

  const suggestedWave = waves.find((wave) => wave.id === suggestedWaveId);

  return (
    <section className="flex flex-col gap-3" aria-label={t("feed.waves.title")}
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-medium uppercase tracking-[0.28em] text-white/60">
          {t("feed.waves.title")}
        </h2>
        {suggestedWave && suggestedWave.id !== activeWaveId && suggestedWave.id !== "all" && (
          <span className="hidden rounded-full bg-white/10 px-3 py-1 text-xs text-white/70 sm:block">
            {t("feed.waves.suggest", {
              wave: `${suggestedWave.emoji} ${t(suggestedWave.labelKey)}`,
            })}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {waves.map((wave) => {
          const isActive = wave.id === activeWaveId;
          return (
            <button
              key={wave.id}
              type="button"
              onClick={() => handleSelect(wave.id)}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap rounded-full border border-white/12 bg-white/5 px-4 py-1.5 text-sm font-medium text-white/80 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
                isActive && "border-white/35 bg-white/15 text-white shadow-[0_0_22px_rgba(255,255,255,0.18)]",
              )}
              aria-pressed={isActive}
            >
              <span aria-hidden="true">{wave.emoji}</span>
              <span>{t(wave.labelKey)}</span>
            </button>
          );
        })}
      </div>

      {suggestedWave && suggestedWave.id !== activeWaveId && suggestedWave.id !== "all" && (
        <p className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white/75 sm:hidden">
          {t("feed.waves.suggest", {
            wave: `${suggestedWave.emoji} ${t(suggestedWave.labelKey)}`,
          })}
        </p>
      )}
    </section>
  );
};

export default EmotionalWavesBar;

