import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { HeartIcon, PaintBrushIcon, BookOpenIcon, SparklesIcon } from '@heroicons/react/24/solid';
import { Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface WelcomeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

const steps = [
  {
    id: 'welcome',
    title: 'Добро пожаловать!',
    subtitle: 'Рады видеть тебя в Безмятежных',
    description: 'Это пространство для заботы о себе. Давай познакомимся с основными функциями.',
    icon: SparklesIcon,
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-100 dark:bg-amber/20',
    isLucide: false,
  },
  {
    id: 'crisis',
    title: 'Мне плохо',
    subtitle: 'Срочная помощь',
    description: 'Техники самопомощи, дыхательные упражнения и контакты горячих линий — всё под рукой, когда тебе тяжело.',
    icon: HeartIcon,
    iconColor: 'text-red-500',
    iconBg: 'bg-red-100 dark:bg-destructive/20',
    isLucide: false,
  },
  {
    id: 'psychologist',
    title: 'Jiva',
    subtitle: 'Мудрый наставник',
    description: 'Поговори с Jiva. Он выслушает, поможет разобраться в чувствах и даст рекомендации. Помнит историю твоих переживаний.',
    icon: Brain,
    iconColor: 'text-violet-500',
    iconBg: 'bg-violet-100 dark:bg-violet/20',
    isLucide: true,
  },
  {
    id: 'diary',
    title: 'Дневник',
    subtitle: 'Записи эмоций',
    description: 'Отслеживай своё настроение, записывай мысли и наблюдай за прогрессом со временем.',
    icon: BookOpenIcon,
    iconColor: 'text-teal-500',
    iconBg: 'bg-teal-100 dark:bg-emerald/20',
    isLucide: false,
  },
  {
    id: 'art',
    title: 'Арт-терапия',
    subtitle: 'Рисуй и анализируй',
    description: 'Рисуй свободно, а AI проанализирует рисунок и подскажет, что он может говорить о твоём состоянии.',
    icon: PaintBrushIcon,
    iconColor: 'text-violet-500',
    iconBg: 'bg-violet-100 dark:bg-violet/20',
    isLucide: false,
  },
];

export function WelcomeModal({ open, onOpenChange, userId, userName }: WelcomeModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    try {
      await supabase
        .from('profiles')
        .update({ welcome_shown: true })
        .eq('user_id', userId);
    } catch (error) {
      console.error('Error updating welcome_shown:', error);
    }
    onOpenChange(false);
  };

  const handleSkip = () => {
    handleComplete();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-2 border-primary/20 bg-gradient-to-b from-background to-background/95">
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pt-6 pb-2">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                index === currentStep 
                  ? "bg-primary w-6" 
                  : index < currentStep 
                    ? "bg-primary/60" 
                    : "bg-muted-foreground/30"
              )}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="px-6 pb-6"
          >
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <motion.div 
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                className={cn(
                  "p-4 rounded-2xl",
                  step.iconBg
                )}
              >
                {step.isLucide ? (
                  <step.icon className={cn("h-10 w-10", step.iconColor)} />
                ) : (
                  <step.icon className={cn("h-10 w-10", step.iconColor)} />
                )}
              </motion.div>
            </div>

            {/* Content */}
            <div className="text-center space-y-2 mb-6">
              <h2 className="text-xl font-bold text-foreground">
                {isFirstStep ? `${step.title} ${userName}!` : step.title}
              </h2>
              <p className="text-sm font-medium text-primary">
                {step.subtitle}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {!isFirstStep ? (
                <Button
                  variant="outline"
                  onClick={handlePrev}
                  className="flex-1"
                >
                  Назад
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  className="flex-1 text-muted-foreground"
                >
                  Пропустить
                </Button>
              )}
              
              <Button
                onClick={handleNext}
                className="flex-1 bg-gradient-to-r from-primary to-primary/80"
              >
                {isLastStep ? 'Начать' : 'Далее'}
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
