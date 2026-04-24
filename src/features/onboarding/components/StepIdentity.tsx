import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface StepIdentityProps {
    onNext: (data: { name: string }) => void;
}

export const StepIdentity = ({ onNext }: StepIdentityProps) => {
    const [name, setName] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onNext({ name });
        }
    };

    const handleContainerClick = () => {
        // Возвращаем фокус на input при клике на пустое место
        inputRef.current?.focus();
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            onClick={handleContainerClick}
            className="w-full max-w-md text-center space-y-8 cursor-text"
        >
            <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                    Давай знакомиться
                </h1>
                <p className="text-lg text-white/60">
                    Как мне тебя называть?
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6" onClick={(e) => e.stopPropagation()}>
                <Input
                    ref={inputRef}
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Твое имя..."
                    className="text-center text-2xl h-16 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-violet-500/50 focus:ring-violet-500/20 rounded-2xl"
                />

                <Button
                    type="submit"
                    disabled={!name.trim()}
                    className="w-full h-14 text-lg rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)]"
                >
                    Продолжить
                </Button>
            </form>
        </motion.div>
    );
};
