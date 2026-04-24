import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrivalStep } from "./steps/ArrivalStep";
import { AssessmentStep } from "./steps/AssessmentStep";
import { GroundingStep } from "./steps/GroundingStep";
import { BreathingStep } from "./steps/BreathingStep";
import { CheckinStep } from "./steps/CheckinStep";
import { ClosureStep } from "./steps/ClosureStep";
import { HotlineStep } from "./steps/HotlineStep";
import { EscalationStep } from "./steps/EscalationStep";
import { VolumeControl } from "./VolumeControl";

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

// Audio state type for child components
export interface CrisisAudioState {
  isMusicEnabled: boolean;
  volume: number;
  toggleMusic: () => void;
  setVolume: (v: number) => void;
}

const AMBIENT_AUDIO_URL = "/audio/crisis-ambient.mp3";

interface CrisisWizardProps {
  isDark: boolean;
}

export const CrisisWizard = ({ isDark }: CrisisWizardProps) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>("arrival");
  const [anxietyLevel, setAnxietyLevel] = useState<AnxietyLevel>(null);
  const [breathingCycles, setBreathingCycles] = useState(0);
  // Grounding state lifted up to preserve progress when navigating back
  const [groundingSenseIndex, setGroundingSenseIndex] = useState(0);
  const [groundingInputs, setGroundingInputs] = useState<Record<string, string[]>>({});
  // Track consecutive "same" responses for escalation
  const [checkinRepeatCount, setCheckinRepeatCount] = useState(0);
  // Store last check-in response to record outcome in crisis_sessions
  const [lastCheckinResponse, setLastCheckinResponse] = useState<CheckinResponse>(null);

  // Global audio state
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  const [volume, setVolume] = useState(0.3);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
  }, []);

  // Sync volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Play/pause based on state (starts after arrival, stops at closure)
  useEffect(() => {
    const shouldPlay = currentStep !== "arrival" && currentStep !== "closure" && isMusicEnabled;
    
    if (audioRef.current) {
      if (shouldPlay && !isPlaying) {
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      } else if (!shouldPlay && isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [currentStep, isMusicEnabled, isPlaying]);

  const toggleMusic = useCallback(() => {
    setIsMusicEnabled(prev => !prev);
  }, []);

  const handleVolumeChange = useCallback((v: number) => {
    setVolume(v);
    if (v === 0) {
      setIsMusicEnabled(false);
    } else if (!isMusicEnabled) {
      setIsMusicEnabled(true);
    }
  }, [isMusicEnabled]);

  const audioState: CrisisAudioState = {
    isMusicEnabled,
    volume,
    toggleMusic,
    setVolume: handleVolumeChange,
  };

  const getNextStep = useCallback((step: WizardStep, response?: string): WizardStep => {
    switch (step) {
      case "arrival":
        return "assessment";
      case "assessment":
        if (response === "high") return "grounding";
        return "breathing";
      case "grounding":
        return "breathing";
      case "breathing":
        return "checkin";
      case "checkin":
        if (response === "better") return "closure";
        if (response === "worse") return "hotline";
        return "breathing"; // same → repeat (handled specially in handleCheckin)
      case "escalation":
        return "breathing";
      case "hotline":
        return "closure";
      default:
        return "closure";
    }
  }, []);

  const handleStart = useCallback(() => {
    setCurrentStep("assessment");
  }, []);

  const handleAssessment = useCallback((level: AnxietyLevel) => {
    setAnxietyLevel(level);
    const nextStep = getNextStep("assessment", level || "medium");
    setCurrentStep(nextStep);
  }, [getNextStep]);

  const handleGroundingComplete = useCallback(() => {
    setCurrentStep("breathing");
  }, []);

  const handleBreathingComplete = useCallback(() => {
    setBreathingCycles(prev => prev + 1);
    setCurrentStep("checkin");
  }, []);

  const handleCheckin = useCallback((response: CheckinResponse) => {
    setLastCheckinResponse(response);
    if (response === "better") {
      setCheckinRepeatCount(0);
      setCurrentStep("closure");
    } else if (response === "worse") {
      setCheckinRepeatCount(0);
      setCurrentStep("hotline");
    } else {
      // response === "same"
      if (checkinRepeatCount >= 2) {
        // After 2+ repeats, offer escalation
        setCurrentStep("escalation");
      } else {
        setCheckinRepeatCount(prev => prev + 1);
        setCurrentStep("breathing");
      }
    }
  }, [checkinRepeatCount]);

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
  }, []);

  const handleEmergency = useCallback(() => {
    setCurrentStep("hotline");
  }, []);

  const handleBack = useCallback(() => {
    if (currentStep === "assessment") setCurrentStep("arrival");
    else if (currentStep === "grounding") setCurrentStep("assessment");
    else if (currentStep === "breathing") {
      // High anxiety went through grounding, others went directly from assessment
      if (anxietyLevel === "high") {
        setCurrentStep("grounding");
      } else {
        setCurrentStep("assessment");
      }
    }
    else if (currentStep === "checkin") setCurrentStep("breathing");
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
        return (
          <CheckinStep 
            {...stepProps} 
            onSelect={handleCheckin}
          />
        );
      case "closure":
        return (
          <ClosureStep 
            {...stepProps} 
            onRepeat={handleRepeat}
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

  // Show volume control on steps where music plays
  const showVolumeControl = currentStep !== "arrival" && currentStep !== "closure";

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
      
      {showVolumeControl && (
        <VolumeControl isDark={isDark} audioState={audioState} />
      )}
    </div>
  );
};
