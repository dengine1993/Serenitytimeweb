import { motion } from "framer-motion";
import { Sparkles, Shield, Anchor } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepGoalProps {
    onNext: (data: { goal: string }) => void;
}

const GOALS = [
    { id: "silence", label: "Тишину", icon: Sparkles, desc: "Успокоить мысли", color: "from-teal-400 to-emerald-500" },
    { id: "understanding", label: "Понимание", icon: Shield, desc: "Быть услышанным", color: "from-violet-400 to-purple-500" },
    { id: "support", label: "Опору", icon: Anchor, desc: "Почувствовать силу", color: "from-amber-400 to-orange-500" },
];

export const StepGoal = ({ onNext }: StepGoalProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-4xl text-center space-y-12"
        >
            <div className="space-y-2">
                <h2 className="text-3xl md:text-4xl font-bold text-white">
                    Что хочешь почувствовать?
                </h2>
                <p className="text-lg text-white/60">
                    Прямо сейчас
                </p>
            </div>

            <div className="flex flex-col md:flex-row gap-6 justify-center items-stretch">
                {GOALS.map((item, index) => (
                    <motion.button
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.15 }}
                        onClick={() => onNext({ goal: item.label })}
                        className="group relative flex-1 min-w-[200px] p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all flex flex-col items-center gap-6"
                    >
                        <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-b rounded-3xl", item.color)} />

                        <div className={cn(
                            "w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br shadow-lg group-hover:scale-110 transition-transform duration-500",
                            item.color
                        )}>
                            <item.icon className="w-10 h-10 text-white" />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-white">
                                {item.label}
                            </h3>
                            <p className="text-white/50 group-hover:text-white/70 transition-colors">
                                {item.desc}
                            </p>
                        </div>
                    </motion.button>
                ))}
            </div>
        </motion.div>
    );
};
