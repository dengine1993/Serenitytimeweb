import { motion } from "framer-motion";
import { Sparkles, Home, RotateCcw, CheckCircle, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import logoImage from "@/assets/logo-bezm.png";

interface ClosureStepProps {
  isDark: boolean;
  onRepeat: () => void;
  onBack: () => void;
  onMount?: () => void;
  anxietyLevel?: "high" | "medium" | "low" | null;
  breathingCycles?: number;
  didGrounding?: boolean;
  checkinResponse?: "better" | "same" | "worse" | null;
}

export const ClosureStep = ({
  isDark,
  onRepeat,
  onMount,
  anxietyLevel,
  breathingCycles,
  didGrounding,
  checkinResponse,
}: ClosureStepProps) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    onMount?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateCrisisNote = (): string => {
    const parts: string[] = [];
    if (anxietyLevel) {
      const levelText =
        anxietyLevel === "high"
          ? t("crisis.wizard.closure.noteIntensityHigh")
          : anxietyLevel === "medium"
            ? t("crisis.wizard.closure.noteIntensityMedium")
            : t("crisis.wizard.closure.noteIntensityLow");
      parts.push(`${t("crisis.wizard.closure.noteIntensity")}: ${levelText}`);
    }
    if (didGrounding) parts.push(t("crisis.wizard.closure.noteGrounding"));
    if (breathingCycles && breathingCycles > 0) {
      parts.push(t("crisis.wizard.closure.noteBreathing", { count: breathingCycles }));
    }
    if (checkinResponse === "better") parts.push(t("crisis.wizard.closure.noteBetter"));
    else if (checkinResponse === "same") parts.push(t("crisis.wizard.closure.noteSame"));
    else if (checkinResponse === "worse") parts.push(t("crisis.wizard.closure.noteWorse"));
    return parts.join(" · ");
  };

  useEffect(() => {
    if (!user || saved) return;

    const autoSave = async () => {
      const techniques: string[] = [];
      if (didGrounding) techniques.push("grounding");
      if (breathingCycles && breathingCycles > 0) techniques.push("breathing");

      const note = generateCrisisNote();

      try {
        const { error } = await supabase.from("crisis_sessions").insert({
          user_id: user.id,
          intensity: anxietyLevel ?? null,
          techniques_used: techniques.length > 0 ? techniques : null,
          outcome: checkinResponse ?? null,
          notes: note || null,
        });

        if (error) {
          console.error("Crisis session save error:", error);
          toast.error(t("crisis.wizard.closure.saveError"));
          return;
        }

        setSaved(true);
        toast.success(t("crisis.wizard.closure.savedToast"), { icon: "🆘" });
      } catch (error) {
        console.error("Auto-save error:", error);
      }
    };

    autoSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, saved, anxietyLevel, breathingCycles, didGrounding, checkinResponse]);

  return (
    <div className="flex flex-col items-center text-center px-4 py-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
        className="relative mb-6"
      >
        <div
          className={`absolute inset-0 rounded-full blur-2xl ${
            isDark ? "bg-green-500/30" : "bg-green-300/50"
          }`}
        />
        <div
          className={`relative w-20 h-20 rounded-full flex items-center justify-center ${
            isDark
              ? "bg-gradient-to-br from-green-500 to-emerald-500"
              : "bg-gradient-to-br from-green-400 to-emerald-400"
          }`}
        >
          <Sparkles className="w-10 h-10 text-white" />
        </div>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={`text-2xl font-bold mb-3 ${isDark ? "text-white" : "text-gray-800"}`}
      >
        {t("crisis.wizard.closure.title")}
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className={`text-lg mb-4 max-w-xs leading-relaxed ${
          isDark ? "text-white/80" : "text-gray-600"
        }`}
      >
        {t("crisis.wizard.closure.message")}
      </motion.p>

      {saved && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`flex items-center gap-2 mb-6 px-4 py-2 rounded-full ${
            isDark ? "bg-green-500/20 text-green-300" : "bg-green-100 text-green-700"
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm">{t("crisis.wizard.closure.savedBadge")}</span>
        </motion.div>
      )}

      {!user && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className={`w-full max-w-xs mb-6 p-4 rounded-2xl border ${
            isDark
              ? "bg-white/5 border-white/10 text-white/80"
              : "bg-white border-gray-200 text-gray-700 shadow-sm"
          }`}
        >
          <p className={`text-sm font-medium mb-1 ${isDark ? "text-white" : "text-gray-800"}`}>
            {t("crisis.wizard.closure.guestTitle")}
          </p>
          <p className={`text-xs mb-3 ${isDark ? "text-white/60" : "text-gray-500"}`}>
            {t("crisis.wizard.closure.guestSubtitle")}
          </p>
          <Button
            onClick={() => navigate("/auth", { state: { returnUrl: "/app" } })}
            size="sm"
            className={`w-full rounded-xl ${
              isDark
                ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                : "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
            }`}
          >
            <LogIn className="w-4 h-4 mr-2" />
            {t("crisis.wizard.closure.guestSignIn")}
          </Button>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col gap-3 w-full max-w-xs"
      >
        <Button
          onClick={() => {
            if (user) {
              navigate("/app");
            } else {
              navigate("/auth", { state: { returnUrl: "/app" } });
            }
          }}
          size="lg"
          className={`w-full py-4 rounded-xl ${
            isDark
              ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              : "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
          }`}
        >
          <Home className="w-5 h-5 mr-2" />
          {t("crisis.wizard.closure.home")}
        </Button>

        <Button
          onClick={onRepeat}
          variant="ghost"
          size="lg"
          className={`w-full py-4 rounded-xl ${
            isDark
              ? "text-white/60 hover:text-white hover:bg-white/10"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          }`}
        >
          <RotateCcw className="w-5 h-5 mr-2" />
          {t("crisis.wizard.closure.repeat")}
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className={`mt-8 flex items-center gap-3 px-4 py-3 rounded-xl ${
          isDark ? "bg-white/5" : "bg-gray-50"
        }`}
      >
        <img src={logoImage} alt="New Dawn" className="w-10 h-10 rounded-full" />
        <p className={`text-sm italic ${isDark ? "text-white/70" : "text-gray-600"}`}>
          "{t("crisis.wizard.closure.platformMessage")}"
        </p>
      </motion.div>
    </div>
  );
};
