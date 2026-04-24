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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="w-full p-8 bg-card/80 backdrop-blur-xl border-border/50 shadow-2xl">
          <div className="text-center">
            {/* Success icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.1 }}
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20"
            >
              <CheckCircle className="w-10 h-10 text-white" />
            </motion.div>

            <h1 className="text-2xl font-bold text-foreground mb-2">
              Email подтверждён! 🎉
            </h1>
            <p className="text-muted-foreground mb-8">
              Твой аккаунт активирован и готов к использованию
            </p>

            {/* Fork: 3 options */}
            <div className="space-y-3">
              {/* Option 1: Open in main browser (primary) */}
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Globe className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">Рекомендуем</p>
                    <p className="text-xs text-muted-foreground">Открой в Safari или Chrome</p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    // Copy URL to clipboard for easy pasting
                    const url = `${window.location.origin}/auth`;
                    navigator.clipboard?.writeText(url);
                    window.open(url, '_blank');
                  }}
                  className="w-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground"
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
                  className="w-full border-border/50 text-foreground hover:bg-accent h-12"
                >
                  <Smartphone className="w-4 h-4 mr-2" />
                  Установить приложение
                </Button>
              )}

              {/* Option 3: Login here (if already in main browser) */}
              <Button
                variant="ghost"
                onClick={() => navigate('/auth')}
                className="w-full text-muted-foreground hover:text-foreground h-12"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Войти здесь
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-6 px-4">
              💡 Если ты открыл эту страницу из почтового приложения, вернись в основной браузер (Safari/Chrome) для входа
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
