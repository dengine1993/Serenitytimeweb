import { motion } from "framer-motion";
import { Heart, Shield, Wind, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepGoalProps {
    onNext: (data: { goal: string }) => void;
}

const GOALS = [
    { id: "silence", label: "Тишину", icon: Wind, desc: "Покой в голове", color: "from-cyan-500 to-blue-600" },
    { id: "support", label: "Опору", icon: Shield, desc: "Твёрдую почву под ногами", color: "from-emerald-500 to-teal-600" },
    { id: "understanding", label: "Понимание", icon: MessageCircle, desc: "Быть услышанным", color: "from-violet-500 to-purple-600" },
    { id: "breathe", label: "Просто выдохнуть", icon: Heart, desc: "Хоть на минуту", color: "from-rose-500 to-pink-600" },
];

export const StepGoal = ({ onNext }: StepGoalProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-2xl text-center space-y-8"
        >
            <div className="space-y-2">
                <h2 className="text-3xl font-bold text-white">
                    Чего ты хочешь?
                </h2>
                <p className="text-white/60">
                    Что бы ты хотел почувствовать?
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {GOALS.map((goal, index) => (
                    <motion.button
                        key={goal.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => onNext({ goal: goal.label })}
                        className="group relative p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-left overflow-hidden"
                    >
                        <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-br", goal.color)} />

                        <goal.icon className="w-8 h-8 mb-4 text-white/80 group-hover:text-white transition-colors" />

                        <h3 className="text-xl font-semibold text-white mb-1">
                            {goal.label}
                        </h3>
                        <p className="text-sm text-white/50 group-hover:text-white/70 transition-colors">
                            {goal.desc}
                        </p>
                    </motion.button>
                ))}
            </div>
        </motion.div>
    );
};
