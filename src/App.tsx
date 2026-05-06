import { lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { LegalModalProvider } from "@/components/legal/LegalModalProvider";
import { BottomDock } from "./components/navigation/BottomDock";
import { TopHeader } from "./components/navigation/TopHeader";
import { AnimatePresence } from "framer-motion";
import PageTransition from "./components/PageTransition";
// JivaFloatingButton removed — Hero card on home is the single Jiva entry point


import { PWAInstallPrompt } from "./components/pwa/PWAInstallPrompt";
import { PWAUpdatePrompt } from "./components/pwa/PWAUpdatePrompt";
import { CookieBanner } from "./components/cookies/CookieBanner";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { ReConsentModal } from "./components/legal/ReConsentModal";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useDeviceFingerprint } from "@/hooks/useDeviceFingerprint";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Crisis from "./pages/Crisis";
import BreathingExercise from "./pages/BreathingExercise";
import GroundingExercise from "./pages/GroundingExercise";
import NotFound from "./pages/NotFound";
import { ArtTherapyPage } from "./pages/ArtTherapy";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

const Community = lazy(() => import("./pages/Community"));
const Home = lazy(() => import("./pages/Home"));
const Referral = lazy(() => import("./pages/Referral"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminModeration = lazy(() => import("./pages/admin/Moderation"));
const AdminPayments = lazy(() => import("./pages/admin/Payments"));
const AdminAI = lazy(() => import("./pages/admin/AI"));
const AdminDatabase = lazy(() => import("./pages/admin/Database"));
const AdminLogs = lazy(() => import("./pages/admin/Logs"));
const AdminPricing = lazy(() => import("./pages/admin/Pricing"));
const AdminAiMemory = lazy(() => import("./pages/admin/AiMemory"));
const AdminIncidents = lazy(() => import("./pages/admin/Incidents"));
const AdminNotifications = lazy(() => import("./pages/admin/Notifications"));

const Diary = lazy(() => import("./pages/Diary"));
const CrisisJournal = lazy(() => import("./pages/CrisisJournal"));

const Settings = lazy(() => import("./pages/Settings"));
const Premium = lazy(() => import("./pages/Premium"));
const AiChat = lazy(() => import("./pages/AiChat"));


// Legal pages
const Privacy = lazy(() => import("./pages/legal/Privacy"));
const Offer = lazy(() => import("./pages/legal/Offer"));
const Refund = lazy(() => import("./pages/legal/Refund"));
const Disclaimer = lazy(() => import("./pages/legal/Disclaimer"));
const SellerInfo = lazy(() => import("./pages/legal/SellerInfo"));
const Consent = lazy(() => import("./pages/legal/Consent"));
const Cookies = lazy(() => import("./pages/legal/Cookies"));
const About = lazy(() => import("./pages/About"));
const Install = lazy(() => import("./pages/Install"));
const EmailConfirmed = lazy(() => import("./pages/EmailConfirmed"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
});

// Layout wrapper that shows sidebar/navigation only on authenticated routes
const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTour, setShowTour] = useState(false);
  usePushNotifications();
  useDeviceFingerprint();
  
  const publicRoutes = [
    "/",
    "/auth",
    "/auth/callback",
    "/email-confirmed",
    "/crisis",
    "/breathing-exercise",
    "/grounding-exercise",
    "/privacy",
    "/offer",
    "/refund",
    "/disclaimer",
    "/seller",
    "/consent",
    "/cookies",
    "/install",
    "/about",
  ];

  // Routes that should have immersive layout (no BottomDock, no TopHeader)
  const immersiveRoutes = ["/art-therapy", "/diary", "/diary/sos", "/community", "/settings", "/ai-chat"];

  // Handle SPA redirect from 404.html
  useEffect(() => {
    const redirectPath = sessionStorage.getItem('spa-redirect');
    if (redirectPath) {
      sessionStorage.removeItem('spa-redirect');
      navigate(redirectPath, { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const completed = localStorage.getItem('onboarding_completed');

    if (!completed && location.pathname === '/') {
      setShowOnboarding(true);
    }
  }, [location]);

  useEffect(() => {
    const checkPerformance = async () => {
      const { getDevicePerformance } = await import("@/utils/performance");
      if (getDevicePerformance() === "low") {
        document.body.classList.add("low-perf");
      }
    };
    checkPerformance();
  }, []);

  useEffect(() => {
    const toastState = (location.state as { toast?: { message: string; variant?: "info" | "success" | "error" } })?.toast;
    if (toastState?.message) {
      const { message, variant = "info" } = toastState;
      if (variant === "success") {
        toast.success(message);
      } else if (variant === "error") {
        toast.error(message);
      } else {
        toast(message);
      }
      navigate(location.pathname + location.search, { replace: true });
    }
  }, [location, navigate]);

  const isPublicRoute = publicRoutes.includes(location.pathname);
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isImmersiveRoute = immersiveRoutes.includes(location.pathname) || isAdminRoute;
  const isHomePage = location.pathname === '/app';

  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Immersive routes have their own layout (no dock, no header)
  if (isImmersiveRoute) {
    return (
      <main className="min-h-screen w-full">
        {children}
      </main>
    );
  }

  return (
    <>
      {/* Skip to content link for accessibility */}
      <a 
        href="#main-content" 
        className="skip-to-content"
      >
        Перейти к содержимому
      </a>
      <div className="flex flex-col min-h-screen w-full">
        {!isHomePage && <TopHeader />}
        <main id="main-content" className="flex-1 w-full overflow-x-hidden">
          {children}
        </main>
        <BottomDock />
      </div>
      <PWAInstallPrompt />
    </>
  );
};

const App = () => (
  <HelmetProvider>
    <ThemeProvider attribute="class" defaultTheme="dark">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <PWAUpdatePrompt />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthProvider>
              <LegalModalProvider>
              <AppLayout>
                <AnimatePresence mode="wait">
                  <Suspense fallback={<LoadingScreen />}>
                    <Routes>
                      {/* Public routes */}
                      <Route path="/" element={<Index />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/auth/callback" element={<EmailConfirmed />} />
                      <Route path="/email-confirmed" element={<EmailConfirmed />} />
                      
                      {/* Crisis routes - always accessible */}
                      <Route path="/crisis" element={<Crisis />} />
                      <Route path="/breathing-exercise" element={<BreathingExercise />} />
                      <Route path="/grounding-exercise" element={<GroundingExercise />} />
                      
                      {/* Protected routes - require authentication */}
                      <Route path="/app" element={<ProtectedRoute><PageTransition><Home /></PageTransition></ProtectedRoute>} />
                      
                      <Route path="/diary" element={<ProtectedRoute><PageTransition><Diary /></PageTransition></ProtectedRoute>} />
                      <Route path="/diary/sos" element={<ProtectedRoute><PageTransition><CrisisJournal /></PageTransition></ProtectedRoute>} />
                      
                      <Route path="/settings" element={<ProtectedRoute><PageTransition><Settings /></PageTransition></ProtectedRoute>} />
                      <Route path="/premium" element={<ProtectedRoute><PageTransition><Premium /></PageTransition></ProtectedRoute>} />
                      <Route path="/community" element={<ProtectedRoute><PageTransition><Community /></PageTransition></ProtectedRoute>} />
                      <Route path="/art-therapy" element={<ProtectedRoute><ArtTherapyPage /></ProtectedRoute>} />
                      <Route path="/referral" element={<ProtectedRoute><PageTransition><Referral /></PageTransition></ProtectedRoute>} />
                      <Route path="/payment-success" element={<ProtectedRoute><PageTransition><PaymentSuccess /></PageTransition></ProtectedRoute>} />
                      <Route path="/payment/success" element={<ProtectedRoute><PageTransition><PaymentSuccess /></PageTransition></ProtectedRoute>} />
                      <Route path="/ai-chat" element={<ProtectedRoute><AiChat /></ProtectedRoute>} />
                      
                      
                      {/* Admin routes */}
                      <Route path="/admin" element={<ProtectedRoute><PageTransition><AdminDashboard /></PageTransition></ProtectedRoute>} />
                      <Route path="/admin/users" element={<ProtectedRoute><PageTransition><AdminUsers /></PageTransition></ProtectedRoute>} />
                      <Route path="/admin/moderation" element={<ProtectedRoute><PageTransition><AdminModeration /></PageTransition></ProtectedRoute>} />
                      <Route path="/admin/payments" element={<ProtectedRoute><PageTransition><AdminPayments /></PageTransition></ProtectedRoute>} />
                      <Route path="/admin/ai" element={<ProtectedRoute><PageTransition><AdminAI /></PageTransition></ProtectedRoute>} />
                      <Route path="/admin/database" element={<ProtectedRoute><PageTransition><AdminDatabase /></PageTransition></ProtectedRoute>} />
                      <Route path="/admin/logs" element={<ProtectedRoute><PageTransition><AdminLogs /></PageTransition></ProtectedRoute>} />
                      <Route path="/admin/pricing" element={<ProtectedRoute><PageTransition><AdminPricing /></PageTransition></ProtectedRoute>} />
                      <Route path="/admin/ai-memory" element={<ProtectedRoute><PageTransition><AdminAiMemory /></PageTransition></ProtectedRoute>} />
                      <Route path="/admin/incidents" element={<ProtectedRoute><PageTransition><AdminIncidents /></PageTransition></ProtectedRoute>} />
                      <Route path="/admin/notifications" element={<ProtectedRoute><PageTransition><AdminNotifications /></PageTransition></ProtectedRoute>} />
                      
                      {/* Legal pages */}
                      <Route path="/privacy" element={<PageTransition><Privacy /></PageTransition>} />
                      <Route path="/offer" element={<PageTransition><Offer /></PageTransition>} />
                      <Route path="/refund" element={<PageTransition><Refund /></PageTransition>} />
                      <Route path="/disclaimer" element={<PageTransition><Disclaimer /></PageTransition>} />
                      <Route path="/seller" element={<PageTransition><SellerInfo /></PageTransition>} />
                      <Route path="/consent" element={<PageTransition><Consent /></PageTransition>} />
                      <Route path="/cookies" element={<PageTransition><Cookies /></PageTransition>} />
                      <Route path="/about" element={<PageTransition><About /></PageTransition>} />
                      <Route path="/install" element={<PageTransition><Install /></PageTransition>} />
                      
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </AnimatePresence>
              </AppLayout>
              <CookieBanner />
              <ReConsentModal />
              </LegalModalProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </HelmetProvider>
);

export default App;
