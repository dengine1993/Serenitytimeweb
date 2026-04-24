import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StepIdentity } from "./components/StepIdentity";
import { StepState } from "./components/StepState";
import { StepSymptom } from "./components/StepSymptom";
import { StepGoal } from "./components/StepGoalNew";
import { StepSoftAuth } from "./components/StepSoftAuth";
import { MagicLoader } from "./components/MagicLoader";
import { AudioPlayer } from "./components/AudioPlayer";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export type OnboardingData = {
    name: string;
    state: string;
    symptom: string;
    goal: string;
};

const STEPS = ["identity", "state", "symptom", "goal", "loading", "softAuth", "result"];

export const OnboardingWizard = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);
    const [data, setData] = useState<OnboardingData>({
        name: "",
        state: "",
        symptom: "",
        goal: "",
    });
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [script, setScript] = useState<string | null>(null);

    const handleNext = (newData: Partial<OnboardingData>) => {
        setData((prev) => ({ ...prev, ...newData }));
        setCurrentStep((prev) => prev + 1);
    };

    const handleBack = () => {
        if (currentStep === 0) {
            navigate("/");
            return;
        }
        setCurrentStep((prev) => prev - 1);
    };

    const handleGoalComplete = (finalData: Partial<OnboardingData>) => {
        const completeData = { ...data, ...finalData };
        setData(completeData);
        setCurrentStep(4); // Loading animation
        
        // After 3 seconds, show auth screen
        setTimeout(() => {
            setCurrentStep(5); // SoftAuth screen
        }, 3000);
    };

    const handleAuthComplete = async () => {
        setCurrentStep(6); // Show final loading
        
        // TODO: Call edge function with onboarding data
        // Mock response for now
        setTimeout(() => {
            setAudioUrl("mock-audio-url");
            const capitalizedName = data.name.charAt(0).toUpperCase() + data.name.slice(1).toLowerCase();
            setScript(capitalizedName + ", я вижу, что сейчас внутри " + data.state.toLowerCase() + ". И это нормально — ты не один с этим чувством.");
            setCurrentStep(7); // Result
        }, 2000);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 overflow-hidden relative">
            {/* Background Elements */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(76,29,149,0.15),rgba(15,23,42,0))] pointer-events-none" />

            {/* Header */}
            {currentStep < 4 && (
                <div className="absolute top-6 left-6 z-20">
                    <Button variant="ghost" size="icon" onClick={handleBack} className="text-white/50 hover:text-white hover:bg-white/10">
                        <ChevronLeft className="w-6 h-6" />
                    </Button>
                </div>
            )}

            {/* Progress Bar */}
            {currentStep < 4 && (
                <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                    <motion.div
                        className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                        initial={{ width: "0%" }}
                        animate={{ width: `${((currentStep + 1) / 4) * 100}%` }}
                        transition={{ duration: 0.5 }}
                    />
                </div>
            )}

            <AnimatePresence mode="wait">
                {currentStep === 0 && (
                    <StepIdentity key="identity" onNext={handleNext} />
                )}
                {currentStep === 1 && (
                    <StepState key="state" onNext={handleNext} />
                )}
                {currentStep === 2 && (
                    <StepSymptom key="symptom" onNext={handleNext} />
                )}
                {currentStep === 3 && (
                    <StepGoal key="goal" onNext={handleGoalComplete} />
                )}
                {currentStep === 4 && (
                    <MagicLoader key="loading" />
                )}
                {currentStep === 5 && (
                    <StepSoftAuth key="softAuth" onNext={handleAuthComplete} onboardingData={data} />
                )}
                {currentStep === 6 && (
                    <MagicLoader key="loading2" />
                )}
                {currentStep === 7 && audioUrl && (
                    <AudioPlayer key="result" audioUrl={audioUrl} script={script} />
                )}
            </AnimatePresence>
        </div>
    );
};
