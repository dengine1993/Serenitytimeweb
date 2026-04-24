import { Volume2, VolumeX } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import type { CrisisAudioState } from "./CrisisWizard";

interface VolumeControlProps {
  isDark: boolean;
  audioState: CrisisAudioState;
}

export const VolumeControl = ({ isDark, audioState }: VolumeControlProps) => {
  const { isMusicEnabled, volume, toggleMusic, setVolume } = audioState;

  return (
    <div className={`fixed bottom-4 right-4 flex items-center gap-2 px-3 py-2 rounded-full backdrop-blur-sm z-50 ${
      isDark ? 'bg-black/40 border border-white/10' : 'bg-white/80 border border-gray-200 shadow-sm'
    }`}>
      <button
        onClick={toggleMusic}
        className={`p-1.5 rounded-full transition-colors ${
          isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
        }`}
      >
        {isMusicEnabled && volume > 0 ? (
          <Volume2 className={`w-4 h-4 ${isDark ? 'text-white/80' : 'text-gray-600'}`} />
        ) : (
          <VolumeX className={`w-4 h-4 ${isDark ? 'text-white/50' : 'text-gray-400'}`} />
        )}
      </button>
      <Slider
        value={[volume]}
        onValueChange={(v) => setVolume(v[0])}
        max={1}
        step={0.05}
        className="w-16"
      />
    </div>
  );
};
