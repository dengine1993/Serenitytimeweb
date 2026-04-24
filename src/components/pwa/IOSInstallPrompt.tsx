import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Share, Plus, ArrowDown } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

const IOS_PROMPT_DISMISSED_KEY = 'ios_pwa_prompt_dismissed';
const IOS_PROMPT_DELAY_MS = 3000; // Show after 3 seconds

export const IOSInstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    // Check if running on iOS Safari and not already installed
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone === true;
    const wasDismissed = localStorage.getItem(IOS_PROMPT_DISMISSED_KEY);

    if (isIOS && !isInStandaloneMode && !wasDismissed) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, IOS_PROMPT_DELAY_MS);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem(IOS_PROMPT_DISMISSED_KEY, 'true');
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
            {t('pwaInstall.ios.title')}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {t('pwaInstall.ios.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          {/* Step-by-step instructions */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary shrink-0">
                <span className="font-semibold">1</span>
              </div>
              <div className="flex items-center gap-2">
                <span>{t('pwaInstall.ios.step1')}</span>
                <Share className="h-4 w-4 text-primary" />
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary shrink-0">
                <span className="font-semibold">2</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowDown className="h-4 w-4 text-muted-foreground" />
                <span>{t('pwaInstall.ios.step2')}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary shrink-0">
                <span className="font-semibold">3</span>
              </div>
              <div className="flex items-center gap-2">
                <span>{t('pwaInstall.ios.step3')}</span>
                <Plus className="h-4 w-4 text-primary" />
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="pt-2 border-t border-border/50">
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="text-primary">✓</span>
                {t('pwaInstall.benefits.quickAccess')}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">✓</span>
                {t('pwaInstall.benefits.offline')}
              </li>
            </ul>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleDismiss}
          >
            {t('pwaInstall.ios.understood')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
