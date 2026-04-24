import { motion } from "framer-motion";
import { Moon, HeartCrack, Brain, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepSymptomProps {
    onNext: (data: { symptom: string }) => void;
}

const SYMPTOMS = [
    { id: "sleep", label: "Не могу уснуть", icon: Moon, color: "bg-indigo-500/10 border-indigo-500/20 text-indigo-200" },
    { id: "breath", label: "Трудно дышать", icon: Brain, color: "bg-cyan-500/10 border-cyan-500/20 text-cyan-200" },
    { id: "tears", label: "Хочется плакать", icon: HeartCrack, color: "bg-rose-500/10 border-rose-500/20 text-rose-200" },
    { id: "thoughts", label: "Мысли бегут по кругу", icon: Flame, color: "bg-orange-500/10 border-orange-500/20 text-orange-200" },
];

export const StepSymptom = ({ onNext }: StepSymptomProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-2xl text-center space-y-8"
        >
            <div className="space-y-2">
                <h2 className="text-3xl font-bold text-white">
                    Как это мешает жить?
                </h2>
                <p className="text-white/60">
                    Выбери то, что беспокоит сильнее всего
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {SYMPTOMS.map((item, index) => (
                    <motion.button
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => onNext({ symptom: item.label })}
                        className={cn(
                            "group flex items-center gap-4 p-5 rounded-2xl border transition-all hover:scale-[1.02]",
                            item.color,
                            "hover:bg-opacity-20"
                        )}
                    >
                        <div className="p-3 rounded-xl bg-white/5">
                            <item.icon className="w-6 h-6" />
                        </div>
                        <span className="text-lg font-medium text-white/90 group-hover:text-white">
                            {item.label}
                        </span>
                    </motion.button>
                ))}
            </div>
        </motion.div>
    );
};
