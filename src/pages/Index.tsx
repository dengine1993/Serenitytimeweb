import { useEffect, useState, useMemo, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { MagneticButton } from "@/components/effects/MagneticButton";
import { Button } from "@/components/ui/button";
import { Heart, Smartphone, ArrowRight, MessageCircle, BookHeart, Users, Sparkles } from "lucide-react";
import SEO from "@/components/SEO";
import PageTransition from "@/components/PageTransition";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { supabase } from "@/integrations/supabase/client";
import { motion, useScroll, useTransform } from "framer-motion";
import { getDevicePerformance, shouldUseSimpleEffects } from "@/utils/performance";

import logoImage from "@/assets/logo-bezm.png";
import { TwoPathsSection } from "@/components/landing/TwoPathsSection";
import { WhatsInside } from "@/components/landing/WhatsInside";
import { FAQ } from "@/components/landing/FAQ";
import { StickyCtaBar } from "@/components/landing/StickyCtaBar";
import { FloatingCtaButton } from "@/components/landing/FloatingCtaButton";

import { ScrollToTop } from "@/components/landing/ScrollToTop";
import { LandingLoader } from "@/components/landing/LandingLoader";

const AnimatedShaderBackground = lazy(() => import("@/components/ui/animated-shader-background"));
const FloatingOrbs = lazy(() =>
  import("@/components/effects/FloatingOrbs").then((module) => ({ default: module.FloatingOrbs })),
);
const CursorGlow = lazy(() =>
  import("@/components/effects/CursorGlow").then((module) => ({ default: module.CursorGlow })),
);
const ScrollProgress = lazy(() =>
  import("@/components/effects/ScrollProgress").then((module) => ({ default: module.ScrollProgress })),
);
const AuroraBackground = lazy(() =>
  import("@/components/effects/AuroraBackground").then((module) => ({ default: module.AuroraBackground })),
);
const ParticleField = lazy(() =>
  import("@/components/effects/ParticleField").then((module) => ({ default: module.ParticleField })),
);
const MorphingBlob = lazy(() =>
  import("@/components/effects/MorphingBlob").then((module) => ({ default: module.MorphingBlob })),
);

const Index = () => {
  const auth = useAuth();
  const user = auth?.user;
  const { t } = useI18n();
  const devicePerf = useMemo(() => getDevicePerformance(), []);
  const [simpleEffects, setSimpleEffects] = useState(() => shouldUseSimpleEffects());
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [effectsReady, setEffectsReady] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isIOSDevice] = useState(() => /iPad|iPhone|iPod/.test(navigator.userAgent));
  // Force low performance mode on iOS to prevent lag
  const isLowPerf = devicePerf === 'low' || simpleEffects || isIOSDevice;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Detect iOS devices (not in standalone mode) for install button
  useEffect(() => {
    const checkIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone === true;
    setIsIOS(checkIOS && !isInStandaloneMode);
  }, []);

  // Parallax scroll effects (only on high performance devices)
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, isLowPerf ? 0 : -100]);
  const opacity = useTransform(scrollYProgress, [0, 0.3], [1, isLowPerf ? 1 : 0]);
  const heroOrbScale = useTransform(scrollYProgress, [0, 0.4], [1, isLowPerf ? 1 : 0.85]);
  const heroOrbOffset = useTransform(scrollYProgress, [0, 0.4], [0, isLowPerf ? 0 : -35]);

  useEffect(() => {
    setSimpleEffects(shouldUseSimpleEffects());
  }, []);

  useEffect(() => {
    if (isLowPerf || simpleEffects) {
      if (effectsReady) {
        setEffectsReady(false);
      }
      return;
    }

    if (effectsReady) return;

    // More aggressive delay for heavy effects - wait for user interaction OR 800ms
    const enable = () => setEffectsReady(true);
    const timer = window.setTimeout(enable, 800);

    const options = { once: true, passive: true };
    window.addEventListener("pointerdown", enable, options);
    window.addEventListener("keydown", enable, options);
    window.addEventListener("touchstart", enable, options);
    window.addEventListener("wheel", enable, options);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", enable);
      window.removeEventListener("keydown", enable);
      window.removeEventListener("touchstart", enable);
      window.removeEventListener("wheel", enable);
    };
  }, [isLowPerf, simpleEffects, effectsReady]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const updateMotionPreference = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    updateMotionPreference();
    mediaQuery.addEventListener('change', updateMotionPreference);

    return () => {
      mediaQuery.removeEventListener('change', updateMotionPreference);
    };
  }, []);

  return (
    <PageTransition>
      <LandingLoader />
      <SEO />
      {effectsReady && !isLowPerf && (
        <Suspense fallback={null}>
          <CursorGlow />
        </Suspense>
      )}
      {effectsReady && !simpleEffects && (
        <Suspense fallback={null}>
          <ScrollProgress />
        </Suspense>
      )}
      <div className="relative min-h-screen overflow-x-hidden bg-[#0A0F18] text-white">
        {/* Aurora background - only on desktop high performance */}
        {!isLowPerf && !isMobile && (
          <Suspense fallback={null}>
            <AuroraBackground />
          </Suspense>
        )}
        {/* Particle field - desktop only */}
        {effectsReady && !simpleEffects && !prefersReducedMotion && !isMobile && (
          <div className="pointer-events-none absolute inset-0 opacity-45">
            <Suspense fallback={null}>
              <ParticleField />
            </Suspense>
          </div>
        )}
        {/* Shader background - desktop high perf only */}
        {effectsReady && devicePerf === 'high' && !simpleEffects && !prefersReducedMotion && !isMobile && !isIOSDevice && (
          <div className="pointer-events-none absolute inset-0 opacity-35">
            <Suspense fallback={null}>
              <AnimatedShaderBackground />
            </Suspense>
          </div>
        )}
        {/* Floating orbs - desktop only */}
        {effectsReady && !isLowPerf && !simpleEffects && !prefersReducedMotion && !isMobile && (
          <div className="pointer-events-none absolute inset-0 opacity-40">
            <Suspense fallback={null}>
              <FloatingOrbs />
            </Suspense>
          </div>
        )}

        {/* Morphing background blobs - desktop only, no iOS */}
        {effectsReady && devicePerf !== 'low' && !simpleEffects && !prefersReducedMotion && !isMobile && !isIOSDevice && (
          <>
            <Suspense fallback={null}>
              <MorphingBlob
              color="rgba(255, 226, 189, 0.18)"
              size="700px"
              position="top-24 -left-40"
              delay={0}
            />
            </Suspense>
            <Suspense fallback={null}>
              <MorphingBlob
              color="rgba(120, 146, 255, 0.12)"
              size="600px"
              position="top-1/3 -right-32"
              delay={2}
            />
            </Suspense>
            <Suspense fallback={null}>
              <MorphingBlob
              color="rgba(74, 209, 214, 0.1)"
              size="520px"
              position="bottom-16 left-1/4"
              delay={4}
            />
            </Suspense>
          </>
        )}

      <div className="relative z-10">
        {/* Top Bar - Simplified */}
        <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 pt-6">
          <div className="flex items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              {prefersReducedMotion ? (
                <div className="relative h-11 w-11 flex-shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/30 rounded-full blur-lg" />
                  <img 
                    src={logoImage} 
                    alt="Безмятежные" 
                    className="relative w-full h-full object-contain rounded-full"
                    style={{ filter: 'drop-shadow(0 0 12px rgba(120, 146, 255, 0.4))' }}
                  />
                </div>
              ) : (
                <motion.div
                  className="relative h-11 w-11 flex-shrink-0"
                  whileHover={{ scale: 1.08 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Pulsing ring around logo */}
                  <motion.div
                    className="absolute inset-[-6px] rounded-full border border-cyan-400/40"
                    animate={{ 
                      scale: [1, 1.3, 1],
                      opacity: [0.6, 0, 0.6]
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-br from-cyan-400/30 to-violet-500/30 rounded-full blur-lg"
                    animate={{ 
                      opacity: [0.6, 1, 0.6],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <img 
                    src={logoImage} 
                    alt="Безмятежные" 
                    className="relative w-full h-full object-contain rounded-full"
                    style={{ filter: 'drop-shadow(0 0 16px rgba(120, 146, 255, 0.5))' }}
                  />
                </motion.div>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {isIOS && (
                <Link to="/install">
                  <Button 
                    size="sm"
                    className="text-sm bg-white text-slate-900 hover:bg-white/90 gap-2 font-medium"
                  >
                    <Smartphone className="w-4 h-4" />
                    {t('index.installApp')}
                  </Button>
                </Link>
              )}
              <Link to={user ? "/app" : "/auth"}>
                <Button 
                  variant="ghost" 
                  className="text-sm text-white/70 hover:text-white hover:bg-white/10 px-4"
                >
                  {user ? t('index.hero.openApp') : t('index.hero.signIn')}
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Hero Section - Compact and clear */}
        <section className="w-full px-4 sm:px-8 lg:px-12 text-center relative pt-6 pb-4 sm:pt-20 sm:pb-8 min-h-[30vh] sm:min-h-[45vh] flex flex-col items-center justify-center">
          {/* Stars decoration - visible on all devices */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(25)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-white"
                style={{
                  left: `${(i * 17 + 5) % 100}%`,
                  top: `${(i * 23 + 10) % 80}%`,
                  width: `${1 + (i % 3)}px`,
                  height: `${1 + (i % 3)}px`,
                  opacity: 0.15 + (i % 5) * 0.1,
                }}
              />
            ))}
          </div>

          {/* Gradient background glow for mobile */}
          <div className="absolute inset-0 -top-32 pointer-events-none bg-[radial-gradient(ellipse_80%_50%_at_50%_20%,rgba(120,146,255,0.2),transparent_70%),radial-gradient(ellipse_60%_40%_at_20%_80%,rgba(139,92,246,0.12),transparent_50%),radial-gradient(ellipse_60%_40%_at_80%_70%,rgba(6,182,212,0.1),transparent_50%)]" />

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            style={isMobile ? undefined : { y, opacity }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="w-full relative z-10"
          >
            {/* Brand Name with gradient and glow */}
            <div className="mb-4 sm:mb-6 relative">
              {/* Glow layer behind text */}
              <div className="absolute inset-0 blur-3xl opacity-50 bg-gradient-to-r from-cyan-500/40 via-primary/30 to-violet-500/40 scale-150" />
              
              {prefersReducedMotion ? (
                <h1 className="relative font-hero font-medium text-5xl sm:text-7xl md:text-8xl lg:text-9xl tracking-tight bg-gradient-to-r from-cyan-200 via-white to-violet-300 bg-clip-text text-transparent bg-[length:200%_auto]">
                  {t('index.hero.brandName')}
                </h1>
              ) : (
                <motion.h1
                  className="relative font-hero font-medium text-5xl sm:text-7xl md:text-8xl lg:text-9xl tracking-tight bg-gradient-to-r from-cyan-200 via-white to-violet-300 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-x"
                  initial={{ opacity: 1, scale: 1 }}
                  animate={{
                    scale: [1, 1.02, 1],
                  }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  {t('index.hero.brandName')}
                </motion.h1>
              )}
            </div>

            {/* Slogan */}
            <h2 className="text-xl md:text-2xl text-white/70 font-light leading-snug max-w-md mx-auto mb-4 mt-2">
              {t('index.hero.slogan')}
            </h2>

            <motion.div
              className="flex flex-col items-center gap-4 mt-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              {/* Primary CTA */}
              <Link to={user ? "/app" : "/auth"} className="w-full sm:w-auto">
                <MagneticButton
                  className="w-full sm:w-auto px-8 sm:px-12 py-4 sm:py-5 text-base sm:text-lg font-medium rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_0_24px_rgba(16,185,129,0.25)] hover:shadow-[0_0_32px_rgba(16,185,129,0.4)] border border-emerald-400/20"
                >
                  <span className="flex items-center justify-center gap-2">
                    {t('index.hero.ctaStart')}
                    <ArrowRight className="w-5 h-5" />
                  </span>
                </MagneticButton>
              </Link>

              {/* Trust badges - 4 шт, отражают разные уровни помощи */}
              <div className="flex flex-wrap justify-center gap-1.5 max-w-full px-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-white/65 whitespace-nowrap">
                  <span className="font-extrabold text-rose-300 tracking-wider text-[10px]">SOS</span>
                  {t('index.hero.trustBadges.0')}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-white/65 whitespace-nowrap">
                  <BookHeart className="w-3 h-3 text-emerald-300" />
                  {t('index.hero.trustBadges.1')}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-white/65 whitespace-nowrap">
                  <Users className="w-3 h-3 text-amber-300" />
                  {t('index.hero.trustBadges.2')}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-white/65 whitespace-nowrap">
                  <MessageCircle className="w-3 h-3 text-violet-300" />
                  {t('index.hero.trustBadges.3')}
                </span>
              </div>

              {/* Crisis SOS button - prominent red */}
              <Link to="/crisis" className="mt-2">
                <button className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-[0_0_24px_rgba(239,68,68,0.5)] hover:shadow-[0_0_32px_rgba(239,68,68,0.7)] border border-red-400/40 transition-all group">
                  <span className="font-extrabold tracking-widest text-sm">SOS</span>
                  <span className="text-sm">{t('index.hero.ctaCrisisLink')}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </Link>
            </motion.div>

          </motion.div>

          {/* Floating elements - desktop only */}
          {!isMobile && (
            <>
              <motion.div
                className="absolute top-20 left-10 w-20 h-20 rounded-full bg-primary/10 blur-2xl"
                animate={{
                  y: [0, -30, 0],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <motion.div
                className="absolute bottom-40 right-20 w-32 h-32 rounded-full bg-secondary/10 blur-3xl"
                animate={{
                  y: [0, 40, 0],
                  scale: [1, 1.3, 1],
                }}
                transition={{
                  duration: 7,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </>
          )}
        </section>

        {/* What's Inside — 3 уровня помощи */}
        <WhatsInside />

        {/* Two Paths Section - Free vs Premium */}
        <div id="two-paths" className="scroll-mt-20">
          <TwoPathsSection />
        </div>


        {/* FAQ Section */}
        <FAQ />

        {/* Footer */}
        <footer className="w-full px-4 sm:px-8 lg:px-16 xl:px-24 py-5 border-t border-white/5">
          <div className="flex flex-col items-center gap-3">
            {/* Desktop: Full links */}
            <nav className="hidden sm:flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/50">
              {isIOS && (
                <Link to="/install" className="hover:text-white/80 transition-colors flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  Установить приложение
                </Link>
              )}
              <Link to="/privacy" className="hover:text-white/80 transition-colors">Политика конфиденциальности</Link>
              <Link to="/offer" className="hover:text-white/80 transition-colors">Публичная оферта</Link>
              <Link to="/refund" className="hover:text-white/80 transition-colors">Условия возврата</Link>
              <Link to="/disclaimer" className="hover:text-white/80 transition-colors">Отказ от ответственности</Link>
              <Link to="/seller" className="hover:text-white/80 transition-colors">Информация о продавце</Link>
            </nav>
            {/* Mobile: Collapsed links */}
            <details className="sm:hidden text-center group">
              <summary className="text-xs text-white/50 cursor-pointer list-none flex items-center justify-center gap-1 hover:text-white/70 transition-colors">
                Правовая информация
                <svg className="w-3 h-3 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <nav className="flex flex-col gap-2 mt-3 text-xs text-white/50">
                {isIOS && (
                  <Link to="/install" className="hover:text-white/80 transition-colors flex items-center justify-center gap-1.5">
                    <Smartphone className="w-3 h-3" />
                    Установить приложение
                  </Link>
                )}
                <Link to="/privacy" className="hover:text-white/80 transition-colors">Политика конфиденциальности</Link>
                <Link to="/offer" className="hover:text-white/80 transition-colors">Публичная оферта</Link>
                <Link to="/refund" className="hover:text-white/80 transition-colors">Условия возврата</Link>
                <Link to="/disclaimer" className="hover:text-white/80 transition-colors">Отказ от ответственности</Link>
                <Link to="/seller" className="hover:text-white/80 transition-colors">Информация о продавце</Link>
              </nav>
            </details>
            <p className="text-xs text-white/60">© 2026 Безмятежные • v{__APP_VERSION__}</p>
          </div>
        </footer>
        
        {/* Scroll To Top Button */}
        <ScrollToTop />

        {/* Conversion CTAs */}
        <StickyCtaBar />
        {!user && <FloatingCtaButton />}
      </div>
    </div>
    </PageTransition>
  );
};

type TranslateFn = (key: string, options?: Record<string, string | number>) => string;

export default Index;
