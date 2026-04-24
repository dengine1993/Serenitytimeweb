import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";
import type { AnxietyLevel } from "../CrisisWizard";

interface BreathingStepProps {
  isDark: boolean;
  anxietyLevel: AnxietyLevel;
  onComplete: () => void;
  onBack: () => void;
}

type BreathPhase = "inhale" | "hold" | "exhale" | "rest";

// Box Breathing 4-4-4-4 — безопаснее для панических атак, чем 4-7-8
const phaseConfig: Record<BreathPhase, { duration: number; next: BreathPhase }> = {
  inhale: { duration: 4, next: "hold" },
  hold: { duration: 4, next: "exhale" },
  exhale: { duration: 4, next: "rest" },
  rest: { duration: 4, next: "inhale" },
};

const motivations = {
  ru: [
    "Каждый выдох расслабляет тело ещё немного",
    "Ты в безопасности. Дыши со мной",
    "Твоё тело знает, как успокоиться",
    "Ты делаешь это прекрасно",
  ],
  en: [
    "Each exhale relaxes your body a little more",
    "You're safe. Breathe with me",
    "Your body knows how to calm down",
    "You're doing this beautifully",
  ],
};

export const BreathingStep = ({ isDark, anxietyLevel, onComplete, onBack }: BreathingStepProps) => {
  const { t, language } = useI18n();
  const [phase, setPhase] = useState<BreathPhase>("inhale");
  const [counter, setCounter] = useState(phaseConfig.inhale.duration);
  const [cycle, setCycle] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [isStarted, setIsStarted] = useState(false);

  // high: 6 циклов (после grounding), medium: 4, low: 2
  const totalCycles = anxietyLevel === "high" ? 6 : anxietyLevel === "medium" ? 4 : 2;
  const currentMotivation = motivations[language === 'ru' ? 'ru' : 'en'][cycle - 1] || motivations[language === 'ru' ? 'ru' : 'en'][0];

  useEffect(() => {
    if (!isStarted || isPaused) return;

    const timer = setInterval(() => {
      setCounter((prev) => {
        if (prev <= 1) {
          const nextPhase = phaseConfig[phase].next;
          
          if (nextPhase === "inhale") {
            if (cycle >= totalCycles) {
              onComplete();
              return prev;
            }
            setCycle((c) => c + 1);
          }
          
          setPhase(nextPhase);
          return phaseConfig[nextPhase].duration;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isStarted, isPaused, phase, cycle, totalCycles, onComplete]);

  const handleStart = useCallback(() => {
    setIsStarted(true);
  }, []);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  // На вдохе расширяется, на выдохе сужается, на задержке/паузе - не двигается
  const getCircleAnimation = () => {
    switch (phase) {
      case "inhale":
        return { scale: 1.4, transition: { duration: phaseConfig.inhale.duration, ease: "easeOut" as const } };
      case "hold":
        return { scale: 1.4, transition: { duration: 0 } }; // Остаётся большим, без анимации
      case "exhale":
        return { scale: 0.8, transition: { duration: phaseConfig.exhale.duration, ease: "easeOut" as const } };
      case "rest":
        return { scale: 0.8, transition: { duration: 0 } }; // Остаётся маленьким, без анимации
      default:
        return { scale: 1, transition: { duration: 0.3 } };
    }
  };

  const phaseText = t(`crisis.wizard.breathing.${phase}`);

  if (!isStarted) {
    return (
      <div className="flex flex-col items-center text-center px-4 py-8">
        <button
          onClick={onBack}
          className={`self-start mb-6 flex items-center gap-2 text-sm ${
            isDark ? 'text-white/60 hover:text-white/80' : 'text-gray-500 hover:text-gray-700'
          } transition-colors`}
        >
          <ArrowLeft className="w-4 h-4" />
          {t('common.back')}
        </button>

        <h2 className={`text-xl font-semibold mb-4 ${
          isDark ? 'text-white' : 'text-gray-800'
        }`}>
          {t('crisis.wizard.breathing.title')}
        </h2>

        <p className={`mb-8 ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
          {t('crisis.wizard.breathing.instructions')}
        </p>

        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full max-w-xs"
        >
          <Button
            onClick={handleStart}
            size="lg"
            className={`w-full py-6 text-lg font-medium rounded-2xl shadow-lg ${
              isDark 
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white' 
                : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white'
            }`}
          >
            <Play className="w-5 h-5 mr-2" />
            {t('crisis.wizard.breathing.start')}
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center px-4 py-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className={`self-start mb-4 flex items-center gap-2 text-sm ${
          isDark ? 'text-white/60 hover:text-white/80' : 'text-gray-500 hover:text-gray-700'
        } transition-colors`}
      >
        <ArrowLeft className="w-4 h-4" />
        {t('common.back')}
      </button>

      {/* Title */}
      <h2 className={`text-lg font-medium mb-6 ${
        isDark ? 'text-white/80' : 'text-gray-600'
      }`}>
        {t('crisis.wizard.breathing.followCircle')}
      </h2>

      {/* Breathing Circle */}
      <div className="relative w-56 h-56 mb-6 flex items-center justify-center">
        {/* Glow effect - separate layer */}
        <motion.div
          className={`absolute w-64 h-64 rounded-full blur-2xl pointer-events-none ${
            isDark ? 'bg-purple-500/25' : 'bg-blue-300/35'
          }`}
          animate={getCircleAnimation()}
          style={{ willChange: 'transform' }}
        />
        
        {/* Main circle */}
        <motion.div
          className={`w-40 h-40 rounded-full flex flex-col items-center justify-center shadow-2xl ${
            isDark 
              ? 'bg-gradient-to-br from-purple-500/80 to-pink-500/80 border-2 border-white/20' 
              : 'bg-gradient-to-br from-blue-400/80 to-purple-400/80 border-2 border-white/40'
          }`}
          animate={getCircleAnimation()}
          style={{ willChange: 'transform' }}
        >
          <span className="text-white font-medium text-lg">{phaseText}</span>
          <span className="text-white/90 text-4xl font-bold">{counter}</span>
        </motion.div>
      </div>

      {/* Cycle indicator */}
      <div className={`text-sm mb-4 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
        {t('crisis.wizard.breathing.cycle')} {cycle} {t('crisis.wizard.breathing.of')} {totalCycles}
      </div>

      {/* Control buttons */}
      <div className="flex items-center gap-3 mb-6">
        {/* Pause button */}
        <Button
          onClick={togglePause}
          variant="outline"
          size="sm"
          className={`${
            isDark 
              ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' 
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          {isPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
          {isPaused ? t('crisis.wizard.breathing.resume') : t('crisis.wizard.breathing.pause')}
        </Button>
      </div>

      {/* Motivation */}
      <motion.p
        key={cycle}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`text-sm italic max-w-xs ${
          isDark ? 'text-white/60' : 'text-gray-500'
        }`}
      >
        💭 "{currentMotivation}"
      </motion.p>
    </div>
  );
};
