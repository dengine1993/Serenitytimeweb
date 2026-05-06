import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music, Volume2 } from "lucide-react";
import { ArrivalStep } from "./steps/ArrivalStep";
import { AssessmentStep } from "./steps/AssessmentStep";
import { GroundingStep } from "./steps/GroundingStep";
import { BreathingStep } from "./steps/BreathingStep";
import { CheckinStep } from "./steps/CheckinStep";
import { ClosureStep } from "./steps/ClosureStep";
import { HotlineStep } from "./steps/HotlineStep";
import { EscalationStep } from "./steps/EscalationStep";
import { VolumeControl } from "./VolumeControl";
import { useI18n } from "@/hooks/useI18n";

export type WizardStep =
  | "arrival"
  | "assessment"
  | "grounding"
  | "breathing"
  | "checkin"
  | "closure"
  | "hotline"
  | "escalation";

export type AnxietyLevel = "high" | "medium" | "low" | null;
export type CheckinResponse = "better" | "same" | "worse" | null;

export interface CrisisAudioState {
  isMusicEnabled: boolean;
  volume: number;
  toggleMusic: () => void;
  setVolume: (v: number) => void;
}

const AMBIENT_AUDIO_URL = "/audio/crisis-ambient.mp3";
const STATE_KEY = "crisis_wizard_state";

interface PersistedState {
  currentStep: WizardStep;
  anxietyLevel: AnxietyLevel;
  groundingSenseIndex: number;
  groundingInputs: Record<string, string[]>;
  breathingCycles: number;
  checkinRepeatCount: number;
  lastCheckinResponse: CheckinResponse;
}

const loadPersistedState = (): Partial<PersistedState> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(STATE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    // Don't restore terminal states
    if (parsed.currentStep === "closure") return {};
    return parsed;
  } catch {
    return {};
  }
};

const clearPersistedState = () => {
  try {
    sessionStorage.removeItem(STATE_KEY);
  } catch {
    /* ignore */
  }
};

interface CrisisWizardProps {
  isDark: boolean;
}

export const CrisisWizard = ({ isDark }: CrisisWizardProps) => {
  const { t } = useI18n();
  const persisted = loadPersistedState();

  const [currentStep, setCurrentStep] = useState<WizardStep>(persisted.currentStep ?? "arrival");
  const [anxietyLevel, setAnxietyLevel] = useState<AnxietyLevel>(persisted.anxietyLevel ?? null);
  const [breathingCycles, setBreathingCycles] = useState(persisted.breathingCycles ?? 0);
  const [groundingSenseIndex, setGroundingSenseIndex] = useState(persisted.groundingSenseIndex ?? 0);
  const [groundingInputs, setGroundingInputs] = useState<Record<string, string[]>>(
    persisted.groundingInputs ?? {}
  );
  const [checkinRepeatCount, setCheckinRepeatCount] = useState(persisted.checkinRepeatCount ?? 0);
  const [lastCheckinResponse, setLastCheckinResponse] = useState<CheckinResponse>(
    persisted.lastCheckinResponse ?? null
  );

  // Music defaults to OFF — user opts in explicitly
  const [isMusicEnabled, setIsMusicEnabled] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Persist progress on every relevant change
  useEffect(() => {
    if (currentStep === "arrival" || currentStep === "closure") {
      // Don't persist arrival (nothing meaningful) or closure (terminal)
      return;
    }
    try {
      const snapshot: PersistedState = {
        currentStep,
        anxietyLevel,
        groundingSenseIndex,
        groundingInputs,
        breathingCycles,
        checkinRepeatCount,
        lastCheckinResponse,
      };
      sessionStorage.setItem(STATE_KEY, JSON.stringify(snapshot));
    } catch {
      /* ignore */
    }
  }, [
    currentStep,
    anxietyLevel,
    groundingSenseIndex,
    groundingInputs,
    breathingCycles,
    checkinRepeatCount,
    lastCheckinResponse,
  ]);

  // Initialize audio on mount
  useEffect(() => {
    const audio = new Audio(AMBIENT_AUDIO_URL);
    audio.loop = true;
    audio.volume = volume;
    audioRef.current = audio;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Play/pause based on state
  useEffect(() => {
    const shouldPlay =
      currentStep !== "arrival" && currentStep !== "closure" && isMusicEnabled;

    if (audioRef.current) {
      if (shouldPlay && !isPlaying) {
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            // Autoplay blocked or other error — reset state
            setIsPlaying(false);
            setIsMusicEnabled(false);
          });
      } else if (!shouldPlay && isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [currentStep, isMusicEnabled, isPlaying]);

  const toggleMusic = useCallback(() => {
    setIsMusicEnabled((prev) => !prev);
  }, []);

  const handleVolumeChange = useCallback(
    (v: number) => {
      setVolume(v);
      if (v === 0) {
        setIsMusicEnabled(false);
      } else if (!isMusicEnabled) {
        setIsMusicEnabled(true);
      }
    },
    [isMusicEnabled]
  );

  const audioState: CrisisAudioState = {
    isMusicEnabled,
    volume,
    toggleMusic,
    setVolume: handleVolumeChange,
  };

  const handleStart = useCallback(() => {
    setCurrentStep("assessment");
  }, []);

  const handleAssessment = useCallback((level: AnxietyLevel) => {
    setAnxietyLevel(level);
    setCurrentStep(level === "high" ? "grounding" : "breathing");
  }, []);

  const handleGroundingComplete = useCallback(() => {
    setCurrentStep("breathing");
  }, []);

  const handleBreathingComplete = useCallback(() => {
    setBreathingCycles((prev) => prev + 1);
    setCurrentStep("checkin");
  }, []);

  const handleCheckin = useCallback(
    (response: CheckinResponse) => {
      setLastCheckinResponse(response);
      if (response === "better") {
        setCheckinRepeatCount(0);
        setCurrentStep("closure");
      } else if (response === "worse") {
        setCheckinRepeatCount(0);
        setCurrentStep("hotline");
      } else {
        if (checkinRepeatCount >= 2) {
          setCurrentStep("escalation");
        } else {
          setCheckinRepeatCount((prev) => prev + 1);
          setCurrentStep("breathing");
        }
      }
    },
    [checkinRepeatCount]
  );

  const handleEscalationContinue = useCallback(() => {
    setCurrentStep("breathing");
  }, []);

  const handleEscalationTalk = useCallback(() => {
    setCurrentStep("hotline");
  }, []);

  const handleRepeat = useCallback(() => {
    setCurrentStep("arrival");
    setAnxietyLevel(null);
    setBreathingCycles(0);
    setGroundingSenseIndex(0);
    setGroundingInputs({});
    setCheckinRepeatCount(0);
    setLastCheckinResponse(null);
    clearPersistedState();
  }, []);

  const handleEmergency = useCallback(() => {
    setCurrentStep("hotline");
  }, []);

  const handleCrisisEscalation = useCallback(() => {
    setCurrentStep("hotline");
  }, []);

  const handleClosureMount = useCallback(() => {
    // Closure is terminal — clear persisted state when reached
    clearPersistedState();
  }, []);

  const handleBack = useCallback(() => {
    if (currentStep === "assessment") setCurrentStep("arrival");
    else if (currentStep === "grounding") setCurrentStep("assessment");
    else if (currentStep === "breathing") {
      if (anxietyLevel === "high") {
        setCurrentStep("grounding");
      } else {
        setCurrentStep("assessment");
      }
    } else if (currentStep === "checkin") setCurrentStep("breathing");
    else if (currentStep === "escalation") setCurrentStep("checkin");
    else if (currentStep === "hotline") setCurrentStep("checkin");
    else if (currentStep === "closure") setCurrentStep("checkin");
  }, [currentStep, anxietyLevel]);

  const renderStep = () => {
    const stepProps = { isDark, onBack: handleBack };

    switch (currentStep) {
      case "arrival":
        return (
          <ArrivalStep
            {...stepProps}
            onStart={handleStart}
            onEmergency={handleEmergency}
          />
        );
      case "assessment":
        return (
          <AssessmentStep
            {...stepProps}
            onSelect={handleAssessment}
            onEmergency={handleEmergency}
          />
        );
      case "grounding":
        return (
          <GroundingStep
            {...stepProps}
            onComplete={handleGroundingComplete}
            onCrisisEscalation={handleCrisisEscalation}
            senseIndex={groundingSenseIndex}
            onSenseIndexChange={setGroundingSenseIndex}
            allInputs={groundingInputs}
            onInputsChange={setGroundingInputs}
          />
        );
      case "breathing":
        return (
          <BreathingStep
            {...stepProps}
            anxietyLevel={anxietyLevel}
            onComplete={handleBreathingComplete}
          />
        );
      case "checkin":
        return <CheckinStep {...stepProps} onSelect={handleCheckin} />;
      case "closure":
        return (
          <ClosureStep
            {...stepProps}
            onRepeat={handleRepeat}
            onMount={handleClosureMount}
            anxietyLevel={anxietyLevel}
            breathingCycles={breathingCycles}
            didGrounding={anxietyLevel === "high"}
            checkinResponse={lastCheckinResponse}
          />
        );
      case "escalation":
        return (
          <EscalationStep
            {...stepProps}
            onContinueBreathing={handleEscalationContinue}
            onTalkToSomeone={handleEscalationTalk}
          />
        );
      case "hotline":
        return (
          <HotlineStep
            {...stepProps}
            onTryAgain={() => setCurrentStep("breathing")}
          />
        );
      default:
        return null;
    }
  };

  const showVolumeControl = currentStep !== "arrival" && currentStep !== "closure";
  // Show music opt-in toggle on assessment step (single, unobtrusive entry point)
  const showMusicToggle = currentStep === "assessment" && !isMusicEnabled;

  return (
    <div className="w-full max-w-md mx-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>

      {showMusicToggle && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={toggleMusic}
          className={`mx-auto mt-4 flex items-center gap-2 text-xs px-3 py-2 rounded-full transition-colors ${
            isDark
              ? "text-white/50 hover:text-white/80 hover:bg-white/5"
              : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Music className="w-3.5 h-3.5" />
          {t("crisis.wizard.musicToggle.on")}
        </motion.button>
      )}

      {showVolumeControl && isMusicEnabled && (
        <VolumeControl isDark={isDark} audioState={audioState} />
      )}
    </div>
  );
};
