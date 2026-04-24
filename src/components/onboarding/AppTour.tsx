import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sparkles, MessageSquare, Zap, Crown, X, ArrowRight, ArrowLeft, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppTourProps {
  onComplete: () => void;
}

const steps = [
  {
    id: 'welcome',
    icon: Sparkles,
    title: 'Добро пожаловать в Безмятежные, Друг! 🌿',
    content: 'Здесь ты можешь делиться маленькими радостями, общаться с понимающими людьми, рисовать эмоции и находить поддержку.',
    target: null,
  },
  {
    id: 'moment',
    icon: MessageSquare,
    title: 'Поделись моментом дня',
    content: 'Только один раз в сутки — напиши, что хорошего сегодня случилось 😊',
    target: '#moment-input',
  },
  {
    id: 'actions',
    icon: Zap,
    title: 'Быстрые инструменты',
    content: 'Арт-терапия, Дневник, Навигатор, Jiva — все инструменты под рукой',
    target: '#quick-actions',
  },
  {
    id: 'community',
    icon: Users,
    title: 'Сообщество',
    content: 'Общайся с другими в спокойном чате — поддержка и доброта ❤️',
    target: '#community-tab',
  },
  {
    id: 'premium',
    icon: Crown,
    title: 'Premium',
    content: 'Безлимитный Jiva и полный анализ арт-терапии ✨',
    target: '#premium-card',
  },
];

export function AppTour({ onComplete }: AppTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  useEffect(() => {
    // Highlight target element if exists
    if (step.target) {
      const element = document.querySelector(step.target);
      if (element) {
        element.classList.add('tour-highlight');
        return () => element.classList.remove('tour-highlight');
      }
    }
  }, [step.target]);

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

  const handleComplete = () => {
    setIsVisible(false);
    localStorage.setItem('app_tour_completed', 'true');
    onComplete();
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />
        
        {/* Modal */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="bg-card/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-border/50">
            {/* Close button */}
            <button
              onClick={handleComplete}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-accent transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
            
            {/* Progress dots */}
            <div className="flex justify-center gap-1.5 mb-6">
              {steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    index === currentStep 
                      ? "bg-primary w-6" 
                      : index < currentStep 
                        ? "bg-primary/60 w-2" 
                        : "bg-muted-foreground/30 w-2"
                  )}
                />
              ))}
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
                {/* Icon */}
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring" }}
                  className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center"
                >
                  <step.icon className="h-8 w-8 text-primary" />
                </motion.div>

                <h2 className="text-xl font-bold text-foreground mb-3">
                  {step.title}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {step.content}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Actions */}
            <div className="flex gap-3 mt-8">
              {!isFirstStep ? (
                <Button
                  variant="outline"
                  onClick={handlePrev}
                  className="flex-1 h-12 rounded-2xl"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Назад
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  onClick={handleComplete}
                  className="flex-1 h-12 rounded-2xl text-muted-foreground"
                >
                  Пропустить
                </Button>
              )}
              
              <Button
                onClick={handleNext}
                className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-primary to-secondary text-primary-foreground"
              >
                {isLastStep ? 'Начать!' : 'Далее'}
                {!isLastStep && <ArrowRight className="h-4 w-4 ml-2" />}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
