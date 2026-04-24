import { Card } from "@/components/ui/card";
import { Heart, Sparkles, MessageCircle, Lightbulb } from "lucide-react";

interface EmotionalPromptsProps {
  onPromptClick: (prompt: string) => void;
}

const PROMPTS = [
  {
    icon: Heart,
    text: "Сегодня было тяжело...",
    color: "from-red-400/20 to-pink-400/20",
    iconColor: "text-red-200"
  },
  {
    icon: Sparkles,
    text: "Как справиться с тревогой?",
    color: "from-blue-400/20 to-purple-400/20",
    iconColor: "text-blue-200"
  },
  {
    icon: MessageCircle,
    text: "Мне нужна поддержка",
    color: "from-purple-400/20 to-indigo-400/20",
    iconColor: "text-purple-200"
  },
  {
    icon: Lightbulb,
    text: "Что со мной происходит?",
    color: "from-yellow-400/20 to-orange-400/20",
    iconColor: "text-yellow-200"
  }
];

export const EmotionalPrompts = ({ onPromptClick }: EmotionalPromptsProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
      {PROMPTS.map((prompt, index) => {
        const Icon = prompt.icon;
        return (
          <Card
            key={index}
            onClick={() => onPromptClick(prompt.text)}
            className={`
              bg-gradient-to-br ${prompt.color} backdrop-blur-xl border border-white/10 
              p-4 cursor-pointer hover:scale-105 transition-all duration-200
              hover:border-white/30
            `}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <Icon className={`w-5 h-5 ${prompt.iconColor}`} />
              </div>
              <p className="text-white text-sm font-medium">{prompt.text}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
