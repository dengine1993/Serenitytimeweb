import { useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, Eye, Ear, Hand, Wind, Heart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";

interface GroundingStepProps {
  isDark: boolean;
  onComplete: () => void;
  onBack: () => void;
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
  senseIndex,
  onSenseIndexChange,
  allInputs,
  onInputsChange
}: GroundingStepProps) => {
  const { t, language } = useI18n();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const currentSense = senseSteps[senseIndex];
  const Icon = currentSense.icon;
  const progress = ((senseIndex + 1) / senseSteps.length) * 100;
  
  // Get inputs for current sense, initialize if needed
  const inputs = allInputs[currentSense.sense] || Array(currentSense.count).fill("");
  const filledCount = inputs.filter(v => v.trim().length > 0).length;
  const allFilled = filledCount >= currentSense.count;

  // Focus first empty input when sense changes
  useEffect(() => {
    setTimeout(() => {
      const firstEmptyIndex = inputs.findIndex(v => v.trim() === "");
      const focusIndex = firstEmptyIndex !== -1 ? firstEmptyIndex : 0;
      inputRefs.current[focusIndex]?.focus();
    }, 300);
  }, [senseIndex]);

  const handleInputChange = useCallback((index: number, value: string) => {
    const currentInputs = allInputs[currentSense.sense] || Array(currentSense.count).fill("");
    const newInputs = [...currentInputs];
    newInputs[index] = value;
    onInputsChange({ ...allInputs, [currentSense.sense]: newInputs });
  }, [currentSense.sense, currentSense.count, allInputs, onInputsChange]);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const nextIndex = inputs.findIndex((v, i) => i > index && v.trim() === "");
      if (nextIndex !== -1) {
        inputRefs.current[nextIndex]?.focus();
      } else if (index < currentSense.count - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  }, [inputs, currentSense.count]);

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

  const questions = language === 'ru'
    ? {
        see: "Назови 5 вещей, которые ты видишь",
        touch: "Назови 4 вещи, которых можешь коснуться",
        hear: "Назови 3 звука, которые слышишь снаружи",
        smell: "Назови 2 запаха вокруг тебя",
        taste: "Какой вкус у тебя во рту?",
      }
    : {
        see: "Name 5 things you can see",
        touch: "Name 4 things you can touch",
        hear: "Name 3 sounds you hear outside your body",
        smell: "Name 2 scents around you",
        taste: "What taste is in your mouth?",
      };

  const hints = language === 'ru'
    ? {
        see: "птица, что-то на столе, цвет мебели...",
        touch: "волосы, руки, пол, трава, стул...",
        hear: "машина, кондиционер, звуки природы... (внешние звуки, не мысли)",
        smell: "бумага, подушка, что-то снаружи... (подойди понюхать)",
        taste: "жвачка, кофе, чай, слюна...",
      }
    : {
        see: "a bird, something on desk, furniture color...",
        touch: "hair, hands, ground, grass, chair...",
        hear: "car, air conditioning, nature... (external sounds, not thoughts)",
        smell: "paper, pillow, something outside... (go smell something)",
        taste: "gum, coffee, tea, saliva...",
      };

  const currentHint = hints[currentSense.sense as keyof typeof hints];

  const encouragements = language === 'ru' 
    ? [
        "Ты возвращаешься в настоящий момент",
        "Каждый шаг — это победа",
        "Ты справляешься",
        "Почти там",
        "Ты молодец!",
      ]
    : [
        "You're returning to the present",
        "Every step is a victory",
        "You're doing great",
        "Almost there",
        "You're amazing!",
      ];

  const currentQuestion = questions[currentSense.sense as keyof typeof questions];
  const encouragement = encouragements[senseIndex];

  return (
    <div className="flex flex-col items-center text-center px-4 py-6">
      {/* Back button */}
      <button
        onClick={handleBack}
        className={`self-start mb-4 flex items-center gap-2 text-sm ${
          isDark ? 'text-white/60 hover:text-white/80' : 'text-gray-500 hover:text-gray-700'
        } transition-colors`}
      >
        <ArrowLeft className="w-4 h-4" />
        {t('common.back')}
      </button>

      {/* Progress bar */}
      <div className={`w-full h-2 rounded-full mb-6 ${
        isDark ? 'bg-white/10' : 'bg-gray-200'
      }`}>
        <motion.div
          className={`h-full rounded-full ${
            isDark 
              ? 'bg-gradient-to-r from-purple-500 to-pink-500' 
              : 'bg-gradient-to-r from-blue-500 to-purple-500'
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={senseIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="w-full"
        >
          {/* Icon and question */}
          <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
            isDark ? 'bg-white/10' : 'bg-gray-100'
          }`}>
            <Icon className={`w-8 h-8 ${
              isDark ? 'text-purple-400' : 'text-blue-500'
            }`} />
          </div>

          <h2 className={`text-xl font-semibold mb-1 ${
            isDark ? 'text-white' : 'text-gray-800'
          }`}>
            {currentQuestion}
          </h2>
          
          <p className={`text-xs mb-6 ${
            isDark ? 'text-white/65' : 'text-gray-400'
          }`}>
            {currentHint}
          </p>

          {/* Input fields */}
          <div className="space-y-3 mb-6">
            {Array.from({ length: currentSense.count }).map((_, i) => {
              const isFilled = inputs[i]?.trim().length > 0;
              return (
                <div key={i} className="flex items-center gap-3">
                  {/* Progress indicator */}
                  <motion.div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${
                      isFilled
                        ? isDark 
                          ? 'bg-gradient-to-br from-purple-500 to-pink-500' 
                          : 'bg-gradient-to-br from-blue-500 to-purple-500'
                        : isDark 
                          ? 'bg-white/10 border border-white/20' 
                          : 'bg-gray-100 border border-gray-200'
                    }`}
                    animate={isFilled ? { scale: [1, 1.15, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    {isFilled ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : (
                      <span className={`text-xs font-medium ${
                        isDark ? 'text-white/65' : 'text-gray-400'
                      }`}>{i + 1}</span>
                    )}
                  </motion.div>

                  {/* Input field */}
                  <input
                    ref={el => inputRefs.current[i] = el}
                    type="text"
                    value={inputs[i] || ""}
                    onChange={(e) => handleInputChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    className={`flex-1 px-4 py-3 rounded-xl text-base transition-all duration-200 outline-none ${
                      isDark 
                        ? 'bg-white/5 border border-white/10 text-white placeholder:text-white/60 focus:bg-white/10 focus:border-purple-500/50' 
                        : 'bg-white border border-gray-200 text-gray-800 placeholder:text-gray-300 focus:border-blue-400 focus:shadow-sm'
                    } ${isFilled ? (isDark ? 'border-purple-500/30' : 'border-blue-300') : ''}`}
                  />
                </div>
              );
            })}
          </div>

          {/* Ready button */}
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
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0' 
                    : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0'
                  : isDark 
                    ? 'bg-white/10 text-white/65 border border-white/20' 
                    : 'bg-gray-100 text-gray-400 border border-gray-200'
              }`}
            >
              {t('crisis.wizard.grounding.ready')}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>

          {/* Skip button for smell/taste */}
          {currentSense.skippable && (
            <button
              onClick={handleNext}
              className={`text-sm mb-4 ${
                isDark ? 'text-white/65 hover:text-white/80' : 'text-gray-400 hover:text-gray-600'
              } transition-colors`}
            >
              {language === 'ru' ? 'ничего не чувствую →' : 'I don\'t notice anything →'}
            </button>
          )}

          {/* Encouragement */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`text-sm italic ${
              isDark ? 'text-white/50' : 'text-gray-500'
            }`}
          >
            💭 {encouragement}
          </motion.p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
