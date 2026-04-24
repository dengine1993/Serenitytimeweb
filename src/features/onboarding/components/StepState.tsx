import { motion } from "framer-motion";
import { CloudRain, Wind, Zap, Ghost } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepStateProps {
    onNext: (data: { state: string }) => void;
}

const STATES = [
    { id: "storm", label: "Шторм", icon: Wind, desc: "Паника, хаос мыслей", color: "from-cyan-500 to-blue-600" },
    { id: "fog", label: "Туман", icon: CloudRain, desc: "Апатия, выгорание", color: "from-slate-400 to-slate-600" },
    { id: "void", label: "Пустота", icon: Ghost, desc: "Одиночество, грусть", color: "from-indigo-400 to-violet-600" },
    { id: "tension", label: "Напряжение", icon: Zap, desc: "Стресс, давление", color: "from-amber-400 to-orange-600" },
];

export const StepState = ({ onNext }: StepStateProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-2xl text-center space-y-8"
        >
            <div className="space-y-2">
                <h2 className="text-3xl font-bold text-white">
                    Что сейчас внутри?
                </h2>
                <p className="text-white/60">
                    Выбери метафору своего состояния
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {STATES.map((state, index) => (
                    <motion.button
                        key={state.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => onNext({ state: state.label })}
                        className="group relative p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-left overflow-hidden"
                    >
                        <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-br", state.color)} />

                        <state.icon className="w-8 h-8 mb-4 text-white/80 group-hover:text-white transition-colors" />

                        <h3 className="text-xl font-semibold text-white mb-1">
                            {state.label}
                        </h3>
                        <p className="text-sm text-white/50 group-hover:text-white/70 transition-colors">
                            {state.desc}
                        </p>
                    </motion.button>
                ))}
            </div>
        </motion.div>
    );
};
