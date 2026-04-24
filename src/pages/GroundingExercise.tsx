import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AnimatedShaderBackground from "@/components/ui/animated-shader-background";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Check } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { shouldUseSimpleEffects } from "@/utils/performance";

const GroundingExercise = () => {
  const simpleEffects = shouldUseSimpleEffects();
  const [searchParams] = useSearchParams();
  const from = searchParams.get("from") || "/crisis";
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<string[]>(["", "", "", "", ""]);

  const steps = [
    {
      number: 5,
      sense: "Назови 5 вещей, которые ты ВИДИШЬ",
      icon: "👀",
      color: "from-blue-400/20 to-cyan-400/20"
    },
    {
      number: 4,
      sense: "Назови 4 вещи, которые ты КАСАЕШЬСЯ или ЧУВСТВУЕШЬ",
      icon: "✋",
      color: "from-purple-400/20 to-pink-400/20"
    },
    {
      number: 3,
      sense: "Назови 3 вещи, которые ты СЛЫШИШЬ",
      icon: "👂",
      color: "from-green-400/20 to-teal-400/20"
    },
    {
      number: 2,
      sense: "Назови 2 вещи, которые ты ЧУВСТВУЕШЬ ЗАПАХ",
      icon: "👃",
      color: "from-yellow-400/20 to-orange-400/20"
    },
    {
      number: 1,
      sense: "Назови 1 вещь, которую ты ОЩУЩАЕШЬ ВКУС",
      icon: "👅",
      color: "from-red-400/20 to-pink-400/20"
    }
  ];

  const handleNext = () => {
    if (!responses[currentStep].trim()) {
      return;
    }
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleResponse = (value: string) => {
    const newResponses = [...responses];
    newResponses[currentStep] = value;
    setResponses(newResponses);
  };

  const isCurrentFilled = responses[currentStep].trim().length > 0;
  const isCompleted = currentStep === steps.length - 1 && isCurrentFilled;

  return (
    <div className="relative min-h-screen overflow-hidden">
      {!simpleEffects && <AnimatedShaderBackground />}
      {simpleEffects && (
        <div
          className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900"
          aria-hidden="true"
        />
      )}
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        <Link to={from}>
          <Button 
            variant="ghost" 
            className="mb-8 text-blue-100 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад
          </Button>
        </Link>

        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">
              Техника заземления 5-4-3-2-1
            </h1>
            <p className="text-xl text-blue-100/70">
              Эта техника помогает вернуться в настоящий момент при тревоге
            </p>
          </div>

          {/* Progress */}
          <div className="flex justify-center gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep 
                    ? 'w-12 bg-gradient-to-r from-blue-400 to-purple-400' 
                    : index < currentStep
                    ? 'w-8 bg-blue-400/50'
                    : 'w-8 bg-white/20'
                }`}
              />
            ))}
          </div>

          {/* Current Step */}
          <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
            <div className="space-y-6">
              <div className={`w-20 h-20 mx-auto rounded-full bg-gradient-to-br ${steps[currentStep].color} flex items-center justify-center`}>
                <span className="text-4xl">{steps[currentStep].icon}</span>
              </div>

              <div className="text-center">
                <div className="text-6xl font-bold text-white mb-2">
                  {steps[currentStep].number}
                </div>
                <h2 className="text-2xl font-bold text-white">
                  {steps[currentStep].sense}
                </h2>
              </div>

              <Textarea
                value={responses[currentStep]}
                onChange={(e) => handleResponse(e.target.value)}
                placeholder="Запиши свои наблюдения здесь..."
                className="min-h-32 bg-white/10 border-white/20 text-white placeholder:text-blue-200/50 resize-none"
              />

              <div className="flex gap-4">
                {currentStep > 0 && (
                  <Button
                    onClick={handlePrev}
                    variant="outline"
                    className="flex-1 py-6 rounded-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    Назад
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  disabled={!isCurrentFilled || currentStep === steps.length - 1}
                  className="flex-1 py-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {currentStep === steps.length - 1 ? (
                    <>
                      <Check className="mr-2 h-5 w-5" />
                      Завершено
                    </>
                  ) : (
                    'Далее'
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Info */}
          <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">Как это работает</h3>
            <p className="text-blue-100/70 leading-relaxed">
              Техника 5-4-3-2-1 помогает переключить внимание с тревожных мыслей на непосредственное 
              окружение. Сосредотачиваясь на своих органах чувств, ты возвращаешь себя в настоящий момент 
              и успокаиваешь нервную систему.
            </p>
          </Card>

          {isCompleted && (
            <Card className="bg-gradient-to-br from-green-500/10 to-blue-500/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-400/20 flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-300" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Отличная работа!</h3>
                <p className="text-blue-100/70">
                  Ты прошёл через все этапы заземления. Как ты себя чувствуешь сейчас?
                </p>
                <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10"
                    onClick={() => window.open("https://www.opencounseling.com/suicide-hotlines", "_blank")}
                  >
                    Найти горячие линии
                  </Button>
                  <Link to="/auth" state={{ returnUrl: "/diary" }}>
                    <Button className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                      Записать ощущение в дневник
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroundingExercise;
