import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Download } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { IOSInstallPrompt } from "./IOSInstallPrompt";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const VALUE_MOMENTS = ['first_ai_message', 'first_diary_entry'];
const STORAGE_KEY = 'pwa_value_moments';
const INSTALL_PROMPTED_KEY = 'pwa_install_prompted';

export const trackValueMoment = (type: string) => {
  if (!VALUE_MOMENTS.includes(type)) return;
  
  const stored = localStorage.getItem(STORAGE_KEY);
  const moments = stored ? JSON.parse(stored) : [];
  
  if (!moments.includes(type)) {
    moments.push(type);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(moments));
  }
};

const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

const isInStandaloneMode = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches 
    || (window.navigator as any).standalone === true;
};

export const PWAInstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const { t } = useI18n();

  // Don't show anything if already in standalone mode
  if (isInStandaloneMode()) {
    return null;
  }

  // Show iOS-specific prompt for iOS devices
  if (isIOS()) {
    return <IOSInstallPrompt />;
  }

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if we should show prompt
    const checkValueMoments = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      const prompted = localStorage.getItem(INSTALL_PROMPTED_KEY);
      
      if (prompted) return;
      
      const moments = stored ? JSON.parse(stored) : [];
      if (moments.length >= 3 && deferredPrompt) {
        setShowPrompt(true);
      }
    };

    const interval = setInterval(checkValueMoments, 5000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearInterval(interval);
    };
  }, [deferredPrompt]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
    localStorage.setItem(INSTALL_PROMPTED_KEY, 'true');
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem(INSTALL_PROMPTED_KEY, 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md animate-in slide-in-from-bottom-4 duration-300">
      <Card className="bg-card/95 backdrop-blur-lg border-border/50 shadow-xl">
        <CardHeader className="relative pb-2">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-8 w-8"
            onClick={handleDismiss}
            aria-label={t('pwaInstall.dismiss')}
          >
            <X className="h-4 w-4" />
          </Button>
          <CardTitle className="text-foreground text-lg pr-8">
            {t('pwaInstall.title', { appName: t('common.appName') })}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {t('pwaInstall.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="text-primary">✓</span>
              {t('pwaInstall.benefits.quickAccess')}
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">✓</span>
              {t('pwaInstall.benefits.offline')}
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">✓</span>
              {t('pwaInstall.benefits.notifications')}
            </li>
          </ul>
          <Button
            onClick={handleInstall}
            className="w-full"
            size="lg"
          >
            <Download className="mr-2 h-4 w-4" />
            {t('pwaInstall.installButton')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
