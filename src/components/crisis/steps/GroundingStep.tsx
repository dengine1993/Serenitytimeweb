import { useCallback, useRef, useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, Eye, Ear, Hand, Wind, Heart, ArrowRight, AlertTriangle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";
import { detectCrisis } from "@/lib/safety";

interface GroundingStepProps {
  isDark: boolean;
  onComplete: () => void;
  onBack: () => void;
  onCrisisEscalation?: () => void;
  // Lifted state for preserving progress
  senseIndex: number;
  onSenseIndexChange: (index: number) => void;
  allInputs: Record<string, string[]>;
  onInputsChange: (inputs: Record<string, string[]>) => void;
}

// Classic 5-4-3-2-1 grounding technique
const senseSteps = [
  { count: 5, sense: "see", icon: Eye, skippable: false },
  { count: 4, sense: "touch", icon: Hand, skippable: false },
  { count: 3, sense: "hear", icon: Ear, skippable: false },
  { count: 2, sense: "smell", icon: Wind, skippable: false },
  { count: 1, sense: "taste", icon: Heart, skippable: false },
];

export const GroundingStep = ({
  isDark,
  onComplete,
  onBack,
  onCrisisEscalation,
  senseIndex,
  onSenseIndexChange,
  allInputs,
  onInputsChange,
}: GroundingStepProps) => {
  const { t, tArray } = useI18n();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [crisisDetected, setCrisisDetected] = useState(false);

  const currentSense = senseSteps[senseIndex];
  const Icon = currentSense.icon;
  const progress = ((senseIndex + 1) / senseSteps.length) * 100;

  const inputs = allInputs[currentSense.sense] || Array(currentSense.count).fill("");
  const filledCount = inputs.filter((v) => v.trim().length > 0).length;
  const allFilled = filledCount >= currentSense.count;

  const encouragements = useMemo(
    () => tArray("crisis.wizard.grounding.encouragements"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Focus first empty input when sense changes
  useEffect(() => {
    setTimeout(() => {
      const firstEmptyIndex = inputs.findIndex((v) => v.trim() === "");
      const focusIndex = firstEmptyIndex !== -1 ? firstEmptyIndex : 0;
      inputRefs.current[focusIndex]?.focus();
    }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [senseIndex]);

  const handleInputChange = useCallback(
    (index: number, value: string) => {
      const currentInputs =
        allInputs[currentSense.sense] || Array(currentSense.count).fill("");
      const newInputs = [...currentInputs];
      newInputs[index] = value;
      onInputsChange({ ...allInputs, [currentSense.sense]: newInputs });

      // Crisis keyword detection on every keystroke
      if (!crisisDetected) {
        const { crisis_flag } = detectCrisis(value);
        if (crisis_flag) setCrisisDetected(true);
      }
    },
    [currentSense.sense, currentSense.count, allInputs, onInputsChange, crisisDetected]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const nextIndex = inputs.findIndex((v, i) => i > index && v.trim() === "");
        if (nextIndex !== -1) {
          inputRefs.current[nextIndex]?.focus();
        } else if (index < currentSense.count - 1) {
          inputRefs.current[index + 1]?.focus();
        }
      }
    },
    [inputs, currentSense.count]
  );

  const handleNext = useCallback(() => {
    if (senseIndex + 1 >= senseSteps.length) {
      onComplete();
    } else {
      onSenseIndexChange(senseIndex + 1);
    }
  }, [senseIndex, onComplete, onSenseIndexChange]);

  const handleBack = useCallback(() => {
    if (senseIndex > 0) {
      onSenseIndexChange(senseIndex - 1);
    } else {
      onBack();
    }
  }, [senseIndex, onBack, onSenseIndexChange]);

  const currentQuestion = t(`crisis.wizard.grounding.questions.${currentSense.sense}`);
  const currentHint = t(`crisis.wizard.grounding.hints.${currentSense.sense}`);
  const encouragement = encouragements[senseIndex] || encouragements[0] || "";

  return (
    <div className="flex flex-col items-center text-center px-4 py-6">
      <button
        onClick={handleBack}
        className={`self-start mb-4 flex items-center gap-2 text-sm ${
          isDark ? "text-white/60 hover:text-white/80" : "text-gray-500 hover:text-gray-700"
        } transition-colors`}
      >
        <ArrowLeft className="w-4 h-4" />
        {t("common.back")}
      </button>

      {/* Progress bar */}
      <div className={`w-full h-2 rounded-full mb-6 ${isDark ? "bg-white/10" : "bg-gray-200"}`}>
        <motion.div
          className={`h-full rounded-full ${
            isDark
              ? "bg-gradient-to-r from-purple-500 to-pink-500"
              : "bg-gradient-to-r from-blue-500 to-purple-500"
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Crisis banner */}
      {crisisDetected && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`w-full mb-4 p-3 rounded-xl flex items-start gap-3 ${
            isDark
              ? "bg-rose-500/15 border border-rose-500/30 text-rose-100"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-left text-sm">
            <p className="mb-2">{t("crisis.wizard.grounding.crisisBanner")}</p>
            <button
              onClick={() => onCrisisEscalation?.()}
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg ${
                isDark ? "bg-rose-500 text-white hover:bg-rose-600" : "bg-rose-600 text-white hover:bg-rose-700"
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              {t("crisis.wizard.grounding.crisisBannerCta")}
            </button>
          </div>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={senseIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="w-full"
        >
          <div
            className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
              isDark ? "bg-white/10" : "bg-gray-100"
            }`}
          >
            <Icon className={`w-8 h-8 ${isDark ? "text-purple-400" : "text-blue-500"}`} />
          </div>

          <h2 className={`text-xl font-semibold mb-1 ${isDark ? "text-white" : "text-gray-800"}`}>
            {currentQuestion}
          </h2>

          <p className={`text-xs mb-6 ${isDark ? "text-white/65" : "text-gray-400"}`}>
            {currentHint}
          </p>

          <div className="space-y-3 mb-6">
            {Array.from({ length: currentSense.count }).map((_, i) => {
              const isFilled = inputs[i]?.trim().length > 0;
              return (
                <div key={i} className="flex items-center gap-3">
                  <motion.div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${
                      isFilled
                        ? isDark
                          ? "bg-gradient-to-br from-purple-500 to-pink-500"
                          : "bg-gradient-to-br from-blue-500 to-purple-500"
                        : isDark
                          ? "bg-white/10 border border-white/20"
                          : "bg-gray-100 border border-gray-200"
                    }`}
                    animate={isFilled ? { scale: [1, 1.15, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    {isFilled ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : (
                      <span
                        className={`text-xs font-medium ${
                          isDark ? "text-white/65" : "text-gray-400"
                        }`}
                      >
                        {i + 1}
                      </span>
                    )}
                  </motion.div>

                  <input
                    ref={(el) => (inputRefs.current[i] = el)}
                    type="text"
                    value={inputs[i] || ""}
                    onChange={(e) => handleInputChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    className={`flex-1 px-4 py-3 rounded-xl text-base transition-all duration-200 outline-none ${
                      isDark
                        ? "bg-white/5 border border-white/10 text-white placeholder:text-white/60 focus:bg-white/10 focus:border-purple-500/50"
                        : "bg-white border border-gray-200 text-gray-800 placeholder:text-gray-300 focus:border-blue-400 focus:shadow-sm"
                    } ${isFilled ? (isDark ? "border-purple-500/30" : "border-blue-300") : ""}`}
                  />
                </div>
              );
            })}
          </div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full max-w-xs mx-auto mb-4"
          >
            <Button
              onClick={handleNext}
              disabled={!allFilled}
              size="lg"
              className={`w-full py-5 text-lg font-medium rounded-xl transition-all ${
                allFilled
                  ? isDark
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0"
                    : "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0"
                  : isDark
                    ? "bg-white/10 text-white/65 border border-white/20"
                    : "bg-gray-100 text-gray-400 border border-gray-200"
              }`}
            >
              {t("crisis.wizard.grounding.ready")}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>

          {currentSense.skippable && (
            <button
              onClick={handleNext}
              className={`text-sm mb-4 ${
                isDark ? "text-white/65 hover:text-white/80" : "text-gray-400 hover:text-gray-600"
              } transition-colors`}
            >
              {t("crisis.wizard.grounding.skip")}
            </button>
          )}

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`text-sm italic ${isDark ? "text-white/50" : "text-gray-500"}`}
          >
            💭 {encouragement}
          </motion.p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
