import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWebPush } from "@/hooks/useWebPush";
import { useAuth } from "@/hooks/useAuth";

export function WebPushPrompt() {
  const { user } = useAuth();
  const { isSupported, isSubscribed, permission, subscribe } = useWebPush();
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user || !isSupported || isSubscribed || dismissed) {
      return;
    }

    // Check if user already dismissed
    const hasDismissed = localStorage.getItem("webpush_dismissed");
    if (hasDismissed) {
      setDismissed(true);
      return;
    }

    // Show prompt after 10 seconds
    const timer = setTimeout(() => {
      if (permission === "default") {
        setShowPrompt(true);
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [user, isSupported, isSubscribed, permission, dismissed]);

  const handleEnable = async () => {
    const sub = await subscribe();
    if (sub) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem("webpush_dismissed", "true");
  };

  if (!isSupported || isSubscribed) {
    return null;
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed bottom-4 right-4 z-[100] max-w-sm"
        >
          <div className="bg-gradient-to-br from-violet-600/95 to-fuchsia-600/95 backdrop-blur-xl border border-white/20 rounded-2xl p-5 shadow-2xl">
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 text-white/60 hover:text-white/90 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Bell className="w-6 h-6 text-white" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Включить уведомления?
                </h3>
                <p className="text-sm text-white/90 mb-4">
                  Получай мгновенные уведомления о реакциях на твои посты и важных событиях в приложении
                </p>

                <div className="flex gap-2">
                  <Button
                    onClick={handleEnable}
                    size="sm"
                    className="bg-white text-violet-600 hover:bg-white/90 font-semibold"
                  >
                    Включить
                  </Button>
                  <Button
                    onClick={handleDismiss}
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/10"
                  >
                    Не сейчас
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
