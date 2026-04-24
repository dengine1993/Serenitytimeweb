import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Share, Plus, ArrowDown, Download, Smartphone, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";

type Platform = 'ios' | 'android' | 'desktop' | 'unknown';

const detectPlatform = (): Platform => {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Windows|Macintosh|Linux/.test(ua) && !/Mobile/.test(ua)) return 'desktop';
  return 'unknown';
};

const isStandalone = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches 
    || (window.navigator as any).standalone === true;
};

const Install = () => {
  const { t } = useI18n();
  const [platform, setPlatform] = useState<Platform>('unknown');
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    setIsInstalled(isStandalone());
  }, []);

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <SEO 
          title={t('install.alreadyInstalled.title')}
          description={t('install.alreadyInstalled.description')}
        />
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <CardTitle>{t('install.alreadyInstalled.title')}</CardTitle>
            <CardDescription>
              {t('install.alreadyInstalled.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/auth" state={{ returnUrl: "/app" }}>
              <Button className="w-full">{t('install.alreadyInstalled.cta')}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title={t('install.title')}
        description={t('install.description')}
      />
      
      <div className="container max-w-2xl mx-auto px-4 py-8 md:py-16">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mb-6 shadow-lg">
            <Smartphone className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            {t('install.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('install.description')}
          </p>
        </div>

        {/* Benefits */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">{t('install.benefits.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span>{t('pwaInstall.benefits.quickAccess')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span>{t('pwaInstall.benefits.offline')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span>{t('pwaInstall.benefits.notifications')}</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Platform-specific instructions */}
        {platform === 'ios' && (
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">🍎</span>
                {t('install.ios.title')}
              </CardTitle>
              <CardDescription>{t('install.ios.subtitle')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-medium">{t('install.ios.step1.title')}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      {t('install.ios.step1.description')}
                      <Share className="h-4 w-4" />
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-medium">{t('install.ios.step2.title')}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      <ArrowDown className="h-4 w-4" />
                      {t('install.ios.step2.description')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-medium">{t('install.ios.step3.title')}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      {t('install.ios.step3.description')}
                      <Plus className="h-4 w-4" />
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {platform === 'android' && (
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">🤖</span>
                {t('install.android.title')}
              </CardTitle>
              <CardDescription>{t('install.android.subtitle')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-medium">{t('install.android.step1.title')}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('install.android.step1.description')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-medium">{t('install.android.step2.title')}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      {t('install.android.step2.description')}
                      <Download className="h-4 w-4" />
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {(platform === 'desktop' || platform === 'unknown') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">💻</span>
                {t('install.desktop.title')}
              </CardTitle>
              <CardDescription>{t('install.desktop.subtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t('install.desktop.description')}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Back to app link */}
        <div className="mt-8 text-center">
          <Link to="/" className="text-primary hover:underline">
            {t('install.backToApp')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Install;
