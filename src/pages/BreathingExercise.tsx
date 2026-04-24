import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, Pause } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useI18n } from "@/hooks/useI18n";

type BreathPhase = "idle" | "inhale" | "hold" | "exhale" | "rest";

// Phase configs for different breathing modes
const phaseConfigs = {
  "444": {
    inhale: { duration: 4, next: "hold" as BreathPhase },
    hold: { duration: 4, next: "exhale" as BreathPhase },
    exhale: { duration: 4, next: "rest" as BreathPhase },
    rest: { duration: 4, next: "inhale" as BreathPhase },
  },
  "478": {
    inhale: { duration: 4, next: "hold" as BreathPhase },
    hold: { duration: 7, next: "exhale" as BreathPhase },
    exhale: { duration: 8, next: "inhale" as BreathPhase },
  },
};

const motivations = {
  ru: [
    "Каждый выдох расслабляет тело ещё немного",
    "Ты в безопасности. Дыши со мной",
    "Твоё тело знает, как успокоиться",
    "Ты делаешь это прекрасно",
    "С каждым циклом становится легче",
  ],
  en: [
    "Each exhale relaxes your body a little more",
    "You're safe. Breathe with me",
    "Your body knows how to calm down",
    "You're doing this beautifully",
    "It gets easier with each cycle",
  ],
};

const BreathingExercise = () => {
  const { language } = useI18n();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "478" ? "478" : "444";
  const from = searchParams.get("from") || "/crisis";
  
  const phaseConfig = useMemo(() => phaseConfigs[mode], [mode]);
  const is478 = mode === "478";
  
  const [phase, setPhase] = useState<BreathPhase>("idle");
  const [counter, setCounter] = useState(is478 ? 4 : 4);
  const [cycle, setCycle] = useState(1);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const totalCycles = 4;
  const currentMotivation = motivations[language === 'ru' ? 'ru' : 'en'][(cycle - 1) % motivations.ru.length];

  useEffect(() => {
    if (!isActive || isPaused || phase === "idle") return;

    const currentPhaseConfig = phaseConfig[phase as Exclude<BreathPhase, "idle" | "rest">];
    if (!currentPhaseConfig) return;

    const timer = setInterval(() => {
      setCounter((prev) => {
        if (prev <= 1) {
          const nextPhase = currentPhaseConfig.next;
          
          if (nextPhase === "inhale") {
            if (cycle >= totalCycles) {
              stopExercise(true);
              return prev;
            }
            setCycle((c) => c + 1);
          }
          
          setPhase(nextPhase);
          const nextConfig = phaseConfig[nextPhase as Exclude<BreathPhase, "idle" | "rest">];
          return nextConfig?.duration || 4;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, isPaused, phase, cycle, phaseConfig]);

  const startExercise = useCallback(() => {
    setIsActive(true);
    setIsPaused(false);
    setPhase("inhale");
    setCounter(phaseConfig.inhale.duration);
    setCycle(1);
  }, [phaseConfig]);

  const stopExercise = useCallback((completed = false) => {
    setIsActive(false);
    setIsPaused(false);
    setPhase("idle");
    setCounter(4);
    setCycle(1);
    
    if (completed) {
      try {
        window.localStorage.setItem('breathing-exercise-completed', 'true');
      } catch (error) {
        console.warn('Failed to mark breathing exercise completion', error);
      }
      toast.success(language === 'ru' 
        ? 'Ты завершил(а) дыхание. Бережно относись к себе 💙' 
        : 'You completed the breathing exercise. Take care of yourself 💙'
      );
    }
  }, [language]);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  const getPhaseText = () => {
    switch (phase) {
      case "inhale":
        return language === 'ru' ? "Вдох" : "Inhale";
      case "hold":
        return language === 'ru' ? "Задержка" : "Hold";
      case "exhale":
        return language === 'ru' ? "Выдох" : "Exhale";
      case "rest":
        return is478 ? "" : (language === 'ru' ? "Пауза" : "Rest");
      default:
        return language === 'ru' ? "Нажми «Начать»" : "Press Start";
    }
  };

  const getCircleAnimation = () => {
    const inhaleDuration = phaseConfig.inhale.duration;
    const exhaleDuration = phaseConfig.exhale.duration;
    
    switch (phase) {
      case "inhale":
        return { scale: 1.4, transition: { duration: inhaleDuration, ease: "easeOut" as const } };
      case "hold":
        return { scale: 1.4, transition: { duration: 0 } };
      case "exhale":
        return { scale: 0.8, transition: { duration: exhaleDuration, ease: "easeOut" as const } };
      case "rest":
        return { scale: 0.8, transition: { duration: 0 } };
      default:
        return { scale: 1, transition: { duration: 0.3 } };
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-900 via-purple-900/20 to-slate-900">
      <div className="relative z-10 container mx-auto px-4 py-8">
        <Link to={from}>
          <Button 
            variant="ghost" 
            className="mb-8 text-white/60 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {language === 'ru' ? "Назад" : "Back"}
          </Button>
        </Link>

        <div className="max-w-md mx-auto flex flex-col items-center">
          {/* Title */}
          <h1 className="text-2xl font-bold text-white mb-2 text-center">
            {is478 
              ? (language === 'ru' ? "Дыхание 4-7-8" : "4-7-8 Breathing")
              : (language === 'ru' ? "Квадратное дыхание 4-4-4-4" : "Box Breathing 4-4-4-4")
            }
          </h1>
          <p className="text-white/60 text-center mb-2">
            {is478
              ? (language === 'ru' 
                  ? "Техника Эндрю Вейла для глубокого расслабления"
                  : "Andrew Weil's technique for deep relaxation")
              : (language === 'ru' 
                  ? "Эта техника помогает успокоить нервную систему"
                  : "This technique helps calm your nervous system")
            }
          </p>
          <p className="text-white/65 text-sm text-center mb-8">
            {is478 
              ? (language === 'ru' 
                  ? "Вдох 4 • задержка 7 • выдох 8"
                  : "Inhale 4 • hold 7 • exhale 8")
              : (language === 'ru' 
                  ? "Вдох 4 • задержка 4 • выдох 4 • пауза 4"
                  : "Inhale 4 • hold 4 • exhale 4 • rest 4")
            }
          </p>

          {/* Breathing Circle */}
          <div className="relative w-56 h-56 mb-8 flex items-center justify-center">
            {/* Glow effect - separate layer */}
            <motion.div
              className="absolute w-64 h-64 rounded-full blur-2xl bg-purple-500/25 pointer-events-none"
              animate={getCircleAnimation()}
              style={{ willChange: 'transform' }}
            />
            
            {/* Main circle */}
            <motion.div
              className="w-44 h-44 rounded-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-500/80 to-pink-500/80 border-2 border-white/20 shadow-2xl"
              animate={getCircleAnimation()}
              style={{ willChange: 'transform' }}
            >
              <span className="text-white font-medium text-lg">{getPhaseText()}</span>
              <span className="text-white/90 text-5xl font-bold">{phase === "idle" ? "—" : counter}</span>
            </motion.div>
          </div>

          {/* Cycle indicator */}
          {isActive && (
            <div className="text-sm text-white/60 mb-6">
              {language === 'ru' ? "Цикл" : "Cycle"} {cycle} {language === 'ru' ? "из" : "of"} {totalCycles}
            </div>
          )}

          {/* Control buttons */}
          <div className="flex items-center gap-3 mb-8">
            {!isActive ? (
              <Button
                onClick={startExercise}
                size="lg"
                className="px-10 py-6 text-lg font-medium rounded-2xl shadow-lg bg-gradient-to-r from-teal-500/90 to-cyan-500/90 hover:from-teal-600/90 hover:to-cyan-600/90 text-white"
              >
                <Play className="w-5 h-5 mr-2" />
                {language === 'ru' ? "Начать" : "Start"}
              </Button>
            ) : (
              <>
                <Button
                  onClick={togglePause}
                  variant="outline"
                  size="lg"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  {isPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
                  {isPaused 
                    ? (language === 'ru' ? "Продолжить" : "Resume") 
                    : (language === 'ru' ? "Пауза" : "Pause")
                  }
                </Button>
                <Button
                  onClick={() => stopExercise(false)}
                  variant="ghost"
                  size="lg"
                  className="text-white/60 hover:text-white hover:bg-white/10"
                >
                  {language === 'ru' ? "Остановить" : "Stop"}
                </Button>
              </>
            )}
          </div>

          {/* Motivation */}
          {isActive && (
            <motion.p
              key={cycle}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm italic text-white/50 text-center max-w-xs"
            >
              💭 "{currentMotivation}"
            </motion.p>
          )}

          {/* Instructions when idle */}
          {!isActive && (
            <div className="mt-4 p-5 rounded-2xl bg-white/5 border border-white/10 max-w-sm">
              <h3 className="text-lg font-semibold text-white mb-3">
                {language === 'ru' ? "Как это работает" : "How it works"}
              </h3>
              <ol className="space-y-2 text-white/70 text-sm">
                {is478 ? (
                  <>
                    <li className="flex gap-3">
                      <span className="text-purple-400 font-bold">1.</span>
                      <span>{language === 'ru' ? "Вдохни через нос на 4 секунды" : "Inhale through nose for 4 seconds"}</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-purple-400 font-bold">2.</span>
                      <span>{language === 'ru' ? "Задержи дыхание на 7 секунд" : "Hold breath for 7 seconds"}</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-purple-400 font-bold">3.</span>
                      <span>{language === 'ru' ? "Медленно выдохни через рот на 8 секунд" : "Slowly exhale through mouth for 8 seconds"}</span>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex gap-3">
                      <span className="text-purple-400 font-bold">1.</span>
                      <span>{language === 'ru' ? "Вдохни через нос на 4 счета" : "Inhale through nose for 4 counts"}</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-purple-400 font-bold">2.</span>
                      <span>{language === 'ru' ? "Задержи дыхание на 4 счета" : "Hold breath for 4 counts"}</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-purple-400 font-bold">3.</span>
                      <span>{language === 'ru' ? "Выдохни через рот на 4 счета" : "Exhale through mouth for 4 counts"}</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-purple-400 font-bold">4.</span>
                      <span>{language === 'ru' ? "Пауза на 4 счета" : "Rest for 4 counts"}</span>
                    </li>
                  </>
                )}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BreathingExercise;