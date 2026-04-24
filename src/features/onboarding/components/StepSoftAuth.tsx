import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface StepSoftAuthProps {
    onNext: () => void;
    onboardingData: {
        name: string;
        state: string;
        symptom: string;
        goal: string;
    };
}

export const StepSoftAuth = ({ onNext, onboardingData }: StepSoftAuthProps) => {
    const { signUp, signInWithGoogle } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleEmailSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return;

        setLoading(true);
        const maxRetries = 2;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                await signUp(email, password, onboardingData.name);
                localStorage.setItem('onboarding_data', JSON.stringify(onboardingData));
                onNext();
                return;
            } catch (error: any) {
                const msg = error?.message || '';
                const isNetwork = /load failed|failed to fetch|networkerror|timeout/i.test(msg);
                if (isNetwork && attempt < maxRetries) {
                    await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
                    continue;
                }
                toast.error(msg || "Ошибка регистрации");
            }
        }
        setLoading(false);
    };

    const handleGoogleSignUp = async () => {
        setLoading(true);
        try {
            localStorage.setItem('onboarding_data', JSON.stringify(onboardingData));
            await signInWithGoogle();
            onNext();
        } catch (error: any) {
            toast.error(error.message || "Ошибка входа через Google");
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md text-center space-y-8"
        >
            <div className="space-y-2">
                <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                    Мы настроились на тебя
                </h2>
                <p className="text-lg text-white/60">
                    Создай аккаунт, чтобы поддержка была рядом
                </p>
            </div>

            <Tabs defaultValue="email" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-white/5">
                    <TabsTrigger value="email">Email</TabsTrigger>
                    <TabsTrigger value="google">Google</TabsTrigger>
                </TabsList>

                <TabsContent value="email" className="space-y-4 mt-6">
                    <form onSubmit={handleEmailSignUp} className="space-y-4">
                        <div className="space-y-2 text-left">
                            <Label htmlFor="email" className="text-white/70">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-violet-500/50"
                                required
                            />
                        </div>

                        <div className="space-y-2 text-left">
                            <Label htmlFor="password" className="text-white/70">Пароль</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Минимум 6 символов"
                                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-violet-500/50"
                                minLength={6}
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={loading || !email || !password}
                            className="w-full h-12 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 transition-all"
                        >
                            {loading ? "Создаём..." : "Создать аккаунт"}
                        </Button>
                    </form>
                </TabsContent>

                <TabsContent value="google" className="space-y-4 mt-6">
                    <Button
                        onClick={handleGoogleSignUp}
                        disabled={loading}
                        className="w-full h-12 bg-white text-slate-900 hover:bg-white/90 transition-all"
                    >
                        {loading ? "Подключаемся..." : "Войти через Google"}
                    </Button>
                </TabsContent>
            </Tabs>

            <p className="text-xs text-white/65 mt-4">
                Регистрируясь, ты принимаешь условия использования и политику конфиденциальности
            </p>
        </motion.div>
    );
};
