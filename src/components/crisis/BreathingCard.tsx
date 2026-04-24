import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

interface BreathingCardProps {
  isDark: boolean;
}

type Phase = 'idle' | 'inhale' | 'hold' | 'exhale' | 'rest';

// Box Breathing 4-4-4-4 — безопаснее для панических атак, чем 4-7-8
const PHASE_DURATIONS: Record<Exclude<Phase, 'idle'>, number> = {
  inhale: 4,
  hold: 4,
  exhale: 4,
  rest: 4
};

const PHASE_ORDER: Exclude<Phase, 'idle'>[] = ['inhale', 'hold', 'exhale', 'rest'];

export const BreathingCard = ({ isDark }: BreathingCardProps) => {
  const { t } = useI18n();
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [countdown, setCountdown] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  
  const timerRef = useRef<number | null>(null);
  const phaseIndexRef = useRef(0);

  useEffect(() => {
    if (!isActive) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Start first phase
    const currentPhase = PHASE_ORDER[phaseIndexRef.current];
    setPhase(currentPhase);
    setCountdown(PHASE_DURATIONS[currentPhase]);

    timerRef.current = window.setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Move to next phase
          phaseIndexRef.current = (phaseIndexRef.current + 1) % PHASE_ORDER.length;
          
          if (phaseIndexRef.current === 0) {
            setCycleCount(c => c + 1);
          }
          
          const nextPhase = PHASE_ORDER[phaseIndexRef.current];
          setPhase(nextPhase);
          
          return PHASE_DURATIONS[nextPhase];
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isActive]);

  const reset = () => {
    setIsActive(false);
    setPhase('idle');
    setCountdown(0);
    setCycleCount(0);
    phaseIndexRef.current = 0;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const getPhaseLabel = () => {
    switch (phase) {
      case 'inhale': return t('crisis.breathing.inhale');
      case 'hold': return t('crisis.breathing.hold');
      case 'exhale': return t('crisis.breathing.exhale');
      case 'rest': return t('crisis.breathing.rest');
      default: return t('crisis.breathing.ready');
    }
  };

  const getCircleScale = () => {
    switch (phase) {
      case 'inhale': return 1.4;
      case 'hold': return 1.4;
      case 'exhale': return 1;
      case 'rest': return 1;
      default: return 1;
    }
  };

  return (
    <div className={`h-full rounded-3xl p-6 backdrop-blur-xl border flex flex-col ${
      isDark 
        ? 'bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-white/10' 
        : 'bg-gradient-to-br from-blue-100/80 to-purple-100/80 border-white/50'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
          {t('crisis.buttons.breathe')}
        </h3>
      </div>

      {/* Breathing Circle */}
      <div className="flex-1 flex items-center justify-center relative">
        <motion.div
          className={`w-32 h-32 rounded-full flex items-center justify-center ${
            isDark 
              ? 'bg-gradient-to-br from-blue-500/40 to-purple-500/40' 
              : 'bg-gradient-to-br from-blue-300/60 to-purple-300/60'
          }`}
          animate={{ 
            scale: getCircleScale(),
            boxShadow: phase !== 'idle' 
              ? `0 0 60px ${isDark ? 'rgba(59, 130, 246, 0.5)' : 'rgba(147, 51, 234, 0.3)'}`
              : 'none'
          }}
          transition={{ 
            duration: phase === 'inhale' ? 4 : phase === 'exhale' ? 4 : 0.3,
            ease: "easeInOut"
          }}
        >
          <div className="text-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={phase}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`text-sm font-medium mb-1 ${isDark ? 'text-white/80' : 'text-gray-600'}`}
              >
                {getPhaseLabel()}
              </motion.div>
            </AnimatePresence>
            {phase !== 'idle' && (
              <motion.div 
                className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}
                key={countdown}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
              >
                {countdown}
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Cycle counter */}
        {cycleCount > 0 && (
          <div className={`absolute top-0 right-0 text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            {t('crisis.breathing.cycles')}: {cycleCount}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2 mt-4">
        <Button
          onClick={() => setIsActive(!isActive)}
          className={`flex-1 ${
            isDark 
              ? 'bg-blue-500/30 hover:bg-blue-500/50 text-white border-blue-400/30' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
          variant={isDark ? "outline" : "default"}
        >
          {isActive ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
          {isActive ? t('crisis.breathing.pause') : t('crisis.breathing.start')}
        </Button>
        {(isActive || cycleCount > 0) && (
          <Button
            onClick={reset}
            variant="outline"
            className={isDark ? 'border-white/20 text-white hover:bg-white/10' : ''}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}
      </div>

      <p className={`text-xs mt-3 text-center ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
        {t('crisis.breathInstruction')}
      </p>
    </div>
  );
};
