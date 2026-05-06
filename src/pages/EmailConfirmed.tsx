import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, Smartphone, LogIn, Globe, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

export default function EmailConfirmed() {
  const navigate = useNavigate();
  const [isPWA, setIsPWA] = useState(false);
  const [processed, setProcessed] = useState(false);

  useEffect(() => {
    // Check if running as PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone
      || document.referrer.includes('android-app://');
    setIsPWA(isStandalone);
  }, []);

  // Process confirmation - delay signOut to show UI first
  useEffect(() => {
    const processConfirmation = async () => {
      // Clear hash tokens from URL immediately
      if (window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname);
      }
      
      // Wait for UI to render before signing out
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // SECURITY: Sign out to prevent session in in-app browser
      await supabase.auth.signOut();
      setProcessed(true);
    };
    
    processConfirmation();
  }, []);

  return (
    <div
      className="dark min-h-screen flex items-center justify-center p-4 text-white"
      style={{ background: 'radial-gradient(ellipse 120% 80% at 50% 0%, #3a1240 0%, #1a0a2e 35%, #0d0820 70%, #07050f 100%)' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="w-full p-8 bg-white/5 backdrop-blur-xl border border-amber-200/10 rounded-3xl shadow-[0_0_60px_rgba(251,146,60,0.08)]">
          <div className="text-center">
            {/* Success icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.1 }}
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_0_24px_rgba(16,185,129,0.3)]"
            >
              <CheckCircle className="w-10 h-10 text-white" />
            </motion.div>

            <h1 className="font-hero font-medium text-3xl bg-gradient-to-r from-amber-200 via-white to-rose-300 bg-clip-text text-transparent mb-2">
              Email подтверждён
            </h1>
            <p className="text-white/70 mb-8">
              Твой аккаунт активирован и готов к использованию
            </p>

            {/* Fork: 3 options */}
            <div className="space-y-3">
              {/* Option 1: Open in main browser (primary) */}
              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-300/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <Globe className="w-5 h-5 text-amber-300" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm text-white">Рекомендуем</p>
                    <p className="text-xs text-white/60">Открой в Safari или Chrome</p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    const url = `${window.location.origin}/auth`;
                    navigator.clipboard?.writeText(url);
                    window.open(url, '_blank');
                  }}
                  className="w-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-95 text-white font-medium shadow-[0_0_24px_rgba(249,115,22,0.25)] hover:shadow-[0_0_32px_rgba(249,115,22,0.4)] border border-orange-400/20"
                >
                  <Globe className="w-4 h-4 mr-2" />
                  Открыть в браузере
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              {/* Option 2: Install PWA */}
              {!isPWA && (
                <Button
                  variant="outline"
                  onClick={() => navigate('/install')}
                  className="w-full rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white h-12"
                >
                  <Smartphone className="w-4 h-4 mr-2" />
                  Установить приложение
                </Button>
              )}

              {/* Option 3: Login here (if already in main browser) */}
              <Button
                variant="ghost"
                onClick={() => navigate('/auth')}
                className="w-full text-white/70 hover:text-white hover:bg-white/10 h-12 rounded-full"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Войти здесь
              </Button>
            </div>

            <p className="text-xs text-white/50 mt-6 px-4">
              Если ты открыл эту страницу из почтового приложения, вернись в основной браузер (Safari/Chrome) для входа
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
