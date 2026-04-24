import { motion, AnimatePresence } from "framer-motion";
import { Check, RotateCcw } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface GroundingCardProps {
  isDark: boolean;
}

const STEPS = [
  { key: 'see', count: 5, icon: '👁️' },
  { key: 'hear', count: 4, icon: '👂' },
  { key: 'feel', count: 3, icon: '✋' },
  { key: 'smell', count: 2, icon: '👃' },
  { key: 'taste', count: 1, icon: '👅' }
];

export const GroundingCard = ({ isDark }: GroundingCardProps) => {
  const { t } = useI18n();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  const completeStep = () => {
    if (currentStep < STEPS.length) {
      setCompletedSteps([...completedSteps, currentStep]);
      
      if (currentStep === STEPS.length - 1) {
        setIsComplete(true);
      } else {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const reset = () => {
    setCurrentStep(0);
    setCompletedSteps([]);
    setIsComplete(false);
  };

  return (
    <div className={`h-full rounded-3xl p-6 backdrop-blur-xl border flex flex-col ${
      isDark 
        ? 'bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-white/10' 
        : 'bg-gradient-to-br from-purple-100/80 to-pink-100/80 border-white/50'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
          {t('crisis.buttons.ground')}
        </h3>
      </div>

      {/* Steps Progress */}
      <div className="flex justify-center gap-2 mb-4">
        {STEPS.map((step, index) => (
          <motion.div
            key={step.key}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-colors ${
              completedSteps.includes(index)
                ? (isDark ? 'bg-green-500/30' : 'bg-green-200')
                : index === currentStep
                ? (isDark ? 'bg-purple-500/40 ring-2 ring-purple-400' : 'bg-purple-300 ring-2 ring-purple-500')
                : (isDark ? 'bg-white/10' : 'bg-gray-200')
            }`}
            animate={index === currentStep ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 1, repeat: index === currentStep ? Infinity : 0 }}
          >
            {completedSteps.includes(index) ? (
              <Check className={`w-5 h-5 ${isDark ? 'text-green-300' : 'text-green-600'}`} />
            ) : (
              step.icon
            )}
          </motion.div>
        ))}
      </div>

      {/* Current Step Content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {isComplete ? (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="text-4xl mb-3">✨</div>
              <p className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                {t('crisis.grounding.complete')}
              </p>
              <p className={`text-sm mt-2 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                {t('crisis.after')}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-center"
            >
              <div className="text-5xl mb-3">{STEPS[currentStep].icon}</div>
              <p className={`text-lg font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                {t(`crisis.grounding.steps.${STEPS[currentStep].key}`)}
              </p>
              <div className={`text-3xl font-bold ${isDark ? 'text-purple-300' : 'text-purple-600'}`}>
                {STEPS[currentStep].count}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="flex gap-2 mt-4">
        {!isComplete ? (
          <>
            <Button
              onClick={completeStep}
              className={`flex-1 ${
                isDark 
                  ? 'bg-purple-500/30 hover:bg-purple-500/50 text-white border-purple-400/30' 
                  : 'bg-purple-500 hover:bg-purple-600 text-white'
              }`}
              variant={isDark ? "outline" : "default"}
            >
              {completedSteps.length === 0 ? t('crisis.grounding.start') : t('crisis.grounding.done')}
            </Button>
            {completedSteps.length > 0 && (
              <Button
                onClick={reset}
                variant="outline"
                className={isDark ? 'border-white/20 text-white hover:bg-white/10' : ''}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
          </>
        ) : (
          <Button
            onClick={reset}
            className={`flex-1 ${
              isDark 
                ? 'bg-purple-500/30 hover:bg-purple-500/50 text-white border-purple-400/30' 
                : 'bg-purple-500 hover:bg-purple-600 text-white'
            }`}
            variant={isDark ? "outline" : "default"}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {t('crisis.grounding.again')}
          </Button>
        )}
      </div>

      <p className={`text-xs mt-3 text-center ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
        {t('crisis.groundInstruction')}
      </p>
    </div>
  );
};
