import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Frown, Meh, Smile } from "lucide-react";
import { getDevicePerformance } from "@/utils/performance";

export const ValueFirstOnboarding = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(true);
  const devicePerf = getDevicePerformance();
  const isLowPerf = devicePerf === 'low';

  if (!isVisible) return null;

  const handleMoodSelection = (mood: 'anxious' | 'sad' | 'okay') => {
    localStorage.setItem('onboarding_completed', 'true');
    setIsVisible(false);

    if (mood === 'anxious') {
      navigate('/crisis');
    } else if (mood === 'sad') {
      navigate('/diary');
    } else {
      // Show sidebar tooltip
      setTimeout(() => {
        const tooltip = document.createElement('div');
        tooltip.className = 'fixed left-20 top-20 bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-4 text-white z-50 animate-in fade-in';
        tooltip.textContent = 'Здесь ты найдешь все инструменты';
        document.body.appendChild(tooltip);
        setTimeout(() => tooltip.remove(), 5000);
      }, 1000);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.95) 0%, rgba(49, 46, 129, 0.95) 100%)',
        backdropFilter: isLowPerf ? 'none' : 'blur(40px)'
      }}
    >
      <Card 
        className="border-white/20 max-w-lg w-full"
        style={{
          background: isLowPerf ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.1)',
          backdropFilter: isLowPerf ? 'none' : 'blur(16px)',
          willChange: 'transform'
        }}
      >
        <CardContent className="pt-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-white">
              Добро пожаловать
            </h2>
            <p className="text-xl text-white/80">
              Как ты себя чувствуешь прямо сейчас?
            </p>
          </div>

          <div className="grid gap-4">
            <Button
              onClick={() => handleMoodSelection('anxious')}
              variant="outline"
              size="lg"
              className="h-auto py-6 border-red-400/30 hover:bg-red-400/10 hover:border-red-400"
              style={{ 
                transition: isLowPerf ? 'none' : 'all 0.2s ease',
                willChange: 'transform'
              }}
            >
              <div className="flex items-center gap-4 w-full">
                <Frown className="h-8 w-8 text-red-400" />
                <div className="text-left">
                  <div className="font-semibold text-white text-lg">Мне тревожно</div>
                  <div className="text-sm text-white/60">Получить экстренную помощь</div>
                </div>
              </div>
            </Button>

            <Button
              onClick={() => handleMoodSelection('sad')}
              variant="outline"
              size="lg"
              className="h-auto py-6 border-blue-400/30 hover:bg-blue-400/10 hover:border-blue-400"
              style={{ 
                transition: isLowPerf ? 'none' : 'all 0.2s ease',
                willChange: 'transform'
              }}
            >
              <div className="flex items-center gap-4 w-full">
                <Meh className="h-8 w-8 text-blue-400" />
                <div className="text-left">
                  <div className="font-semibold text-white text-lg">Мне грустно</div>
                  <div className="text-sm text-white/60">Поговорить с AI-помощником</div>
                </div>
              </div>
            </Button>

            <Button
              onClick={() => handleMoodSelection('okay')}
              variant="outline"
              size="lg"
              className="h-auto py-6 border-green-400/30 hover:bg-green-400/10 hover:border-green-400"
              style={{ 
                transition: isLowPerf ? 'none' : 'all 0.2s ease',
                willChange: 'transform'
              }}
            >
              <div className="flex items-center gap-4 w-full">
                <Smile className="h-8 w-8 text-green-400" />
                <div className="text-left">
                  <div className="font-semibold text-white text-lg">Я в порядке</div>
                  <div className="text-sm text-white/60">Исследовать возможности</div>
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
