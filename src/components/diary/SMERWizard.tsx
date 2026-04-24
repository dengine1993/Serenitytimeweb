import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { EmotionIntensityPicker, type EmotionWithIntensity } from './EmotionIntensityPicker';
import { useI18n } from '@/hooks/useI18n';
import { useSMEREntries, type SMERFormData } from '@/hooks/useSMEREntries';
import { cn } from '@/lib/utils';

interface SMERWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerMood?: string;
  onSuccess?: () => void;
}

type Step = 1 | 2 | 3;

const STEP_TITLES = {
  ru: ['Что случилось?', 'Какие мысли и эмоции?', 'Как можно иначе?'],
  en: ['What happened?', 'Thoughts & emotions?', 'What could be different?']
};

/**
 * 3-step SMER wizard for contextual cognitive analysis
 * Step 1: Situation (what happened)
 * Step 2: Thoughts + Emotions
 * Step 3: Reaction + Alternative (optional)
 */
export function SMERWizard({ open, onOpenChange, triggerMood, onSuccess }: SMERWizardProps) {
  const { language } = useI18n();
  const { saveEntry, saving } = useSMEREntries();
  
  const [step, setStep] = useState<Step>(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [situation, setSituation] = useState('');
  const [thoughts, setThoughts] = useState('');
  const [emotions, setEmotions] = useState<EmotionWithIntensity[]>([]);
  const [reaction, setReaction] = useState('');
  const [alternative, setAlternative] = useState('');

  const isRu = language === 'ru';
  const titles = isRu ? STEP_TITLES.ru : STEP_TITLES.en;

  const canProceed = (currentStep: Step): boolean => {
    switch (currentStep) {
      case 1: return situation.trim().length > 0;
      case 2: return thoughts.trim().length >= 5 && emotions.length > 0;
      case 3: return true; // Optional step
    }
  };

  const handleNext = () => {
    if (step < 3 && canProceed(step)) {
      setStep((s) => (s + 1) as Step);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((s) => (s - 1) as Step);
    }
  };

  const handleSave = async () => {
    const data: SMERFormData = {
      situation: situation.trim(),
      thoughts: thoughts.trim(),
      emotions,
      reaction: reaction.trim() || undefined,
      alternative_reaction: alternative.trim() || undefined
    };

    const result = await saveEntry(data);
    if (result) {
      setShowSuccess(true);
      onSuccess?.();
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setStep(1);
    setSituation('');
    setThoughts('');
    setEmotions([]);
    setReaction('');
    setAlternative('');
    setShowSuccess(false);
  };

  const handleClose = () => {
    if (showSuccess) {
      handleCloseSuccess();
    } else {
      resetForm();
      onOpenChange(false);
    }
  };

  const textareaClass = "min-h-[100px] resize-none bg-white/5 border-white/10 focus:border-primary placeholder:text-white/40 rounded-xl";

  return (
    <>

    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[85vh] sm:h-[80vh] bg-[#0A0C14] border-t border-white/10 rounded-t-3xl flex flex-col">
        <SheetHeader className="pb-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-white flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              {isRu ? 'Анализ ситуации' : 'Situation Analysis'}
            </SheetTitle>
          </div>
          
          {/* Progress indicator */}
          <div className="flex gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-all duration-300",
                  s < step ? "bg-primary" :
                  s === step ? "bg-primary/60" : "bg-white/10"
                )}
              />
            ))}
          </div>
          <p className="text-sm text-white/50 mt-2">
            {isRu ? `Шаг ${step} из 3` : `Step ${step} of 3`} — {titles[step - 1]}
          </p>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-6 px-1">
          <AnimatePresence mode="wait">
            {/* Step 1: Situation */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    {isRu ? 'Ситуация' : 'Situation'}
                  </label>
                  <p className="text-xs text-white/50 mb-3">
                    {isRu 
                      ? 'Опиши факты: что именно произошло, без оценок' 
                      : 'Describe the facts: what exactly happened, without judgments'}
                  </p>
                  <Textarea
                    value={situation}
                    onChange={(e) => setSituation(e.target.value)}
                    placeholder={isRu ? 'Например: позвонили с незнакомого номера / нужно выступить на собрании / жду результатов анализов...' : 'E.g., got a call from an unknown number / need to speak at a meeting / waiting for test results...'}
                    className={textareaClass}
                    autoFocus
                  />
                </div>
              </motion.div>
            )}

            {/* Step 2: Thoughts + Emotions */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    {isRu ? 'Автоматические мысли' : 'Automatic thoughts'}
                  </label>
                  <p className="text-xs text-white/50 mb-3">
                    {isRu 
                      ? 'Запиши первое, что пришло в голову. Обычно это «а вдруг...», «что если...»' 
                      : 'Write down the first thing that came to mind. Usually "what if...", "I can\'t..."'}
                  </p>
                  <Textarea
                    value={thoughts}
                    onChange={(e) => setThoughts(e.target.value)}
                    placeholder={isRu ? 'Например: «А вдруг случится что-то страшное», «Я не смогу это выдержать», «Что если я потеряю контроль», «Все заметят, что мне плохо»...' : 'E.g., "What if something terrible happens", "I won\'t be able to handle this", "What if I lose control", "Everyone will notice I\'m struggling"...'}
                    className={textareaClass}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    {isRu ? 'Какие эмоции?' : 'What emotions?'}
                  </label>
                  <p className="text-xs text-white/50 mb-3">
                    {isRu 
                      ? 'Выбери эмоции и оцени интенсивность (0-10)' 
                      : 'Select emotions and rate intensity (0-10)'}
                  </p>
                  <EmotionIntensityPicker
                    value={emotions}
                    onChange={setEmotions}
                    isLight={false}
                  />
                </div>
              </motion.div>
            )}

            {/* Step 3: Reaction + Alternative */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                  <p className="text-sm text-primary">
                    {isRu 
                      ? '💡 Этот шаг необязательный. Можешь сразу сохранить или подумать об альтернативах.' 
                      : '💡 This step is optional. You can save now or think about alternatives.'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    {isRu ? 'Как ты отреагировал(а)?' : 'How did you react?'}
                  </label>
                  <Textarea
                    value={reaction}
                    onChange={(e) => setReaction(e.target.value)}
                    placeholder={isRu ? 'Например: начал(а) избегать похожих ситуаций; перепроверял(а) всё по несколько раз; искал(а) подтверждение у близких, что всё в порядке; не мог(ла) отвлечься от тревожных мыслей; ушёл/ушла раньше...' : 'E.g., started avoiding similar situations; kept double-checking everything; sought reassurance from others; couldn\'t stop anxious thoughts; left early...'}
                    className={textareaClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    {isRu ? 'Что можно было сделать иначе?' : 'What could have been done differently?'}
                  </label>
                  <p className="text-xs text-white/50 mb-3">
                    {isRu 
                      ? 'Подумай: что сказал бы тебе внимательный друг? Или что бы ты посоветовал(а) близкому в такой ситуации?' 
                      : 'Think: what would a caring friend tell you? Or what would you advise someone close in this situation?'}
                  </p>
                  <Textarea
                    value={alternative}
                    onChange={(e) => setAlternative(e.target.value)}
                    placeholder={isRu ? 'Например: проверить мысль фактами — «что реально произошло, а что я домыслил(а)?»; сказать себе: «тревога — это ощущение, а не предсказание»; остаться в ситуации, не убегая; сделать дыхание 4-7-8; записать 3 аргумента «за» и «против» тревожной мысли...' : 'E.g., check the thought against facts — "what actually happened vs. what I imagined?"; tell myself: "anxiety is a feeling, not a prediction"; stay in the situation without fleeing; do 4-7-8 breathing; write 3 arguments for and against the anxious thought...'}
                    className={textareaClass}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Success state */}
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0C14] z-10 px-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              className="w-16 h-16 rounded-full bg-green-600/20 flex items-center justify-center mb-4"
            >
              <Check className="w-8 h-8 text-green-500" />
            </motion.div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {isRu ? 'Записано!' : 'Saved!'}
            </h3>
            <p className="text-white/60 text-center mb-6">
              {isRu 
                ? 'Ты сделал(а) важный шаг в понимании себя' 
                : 'You took an important step in understanding yourself'}
            </p>
            
            <div className="w-full space-y-3">
              <Button
                variant="ghost"
                onClick={handleCloseSuccess}
                className="w-full text-white/60 hover:text-white hover:bg-white/10"
              >
                {isRu ? 'Закрыть' : 'Close'}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Navigation */}
        {!showSuccess && (
          <div className="shrink-0 pt-4 pb-6 border-t border-white/10 bg-[#0A0C14] flex gap-3">
            {step > 1 && (
              <Button
                variant="ghost"
                onClick={handleBack}
                className="gap-1.5 text-white/60 hover:text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-4 h-4" />
                {isRu ? 'Назад' : 'Back'}
              </Button>
            )}
            
            <div className="flex-1" />
            
            {step < 3 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed(step)}
                className="gap-1.5 bg-primary hover:bg-primary/90"
              >
                {isRu ? 'Далее' : 'Next'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={saving}
                className="gap-1.5 bg-green-600 hover:bg-green-700"
              >
                {saving ? (
                  isRu ? 'Сохранение...' : 'Saving...'
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {isRu ? 'Сохранить' : 'Save'}
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
    </>
  );
}
