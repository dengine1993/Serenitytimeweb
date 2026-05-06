import { useEffect, useState, lazy, Suspense, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Mail, Lock, User, Eye, EyeOff, MapPin, Calendar, Shield } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { shouldUseSimpleEffects, getDevicePerformance } from "@/utils/performance";
import { toast } from "sonner";
import { z } from "zod";
import { ConsentCheckboxes, validateConsents } from "@/components/legal/ConsentCheckboxes";
import { logRegistrationConsents } from "@/lib/consentLogger";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AuroraBackground = lazy(() => 
  import("@/components/effects/AuroraBackground").then(m => ({ default: m.AuroraBackground }))
);

const AnimatedShaderBackground = lazy(() => import("@/components/ui/animated-shader-background"));

// Validation schemas factory (uses i18n)
const buildSchemas = (t: (key: string) => string) => ({
  emailSchema: z.string().email(t('auth.errors.invalidEmail')),
  passwordSchema: z.string()
    .min(8, t('auth.errors.passwordMin'))
    .regex(/[A-Za-zА-Яа-яЁё]/, t('auth.errors.passwordLetter'))
    .regex(/[0-9]/, t('auth.errors.passwordDigit')),
  usernameSchema: z.string().min(2, t('auth.errors.usernameMin')).max(30, t('auth.errors.usernameMax')),
  birthYearSchema: z.number()
    .min(1930, t('auth.errors.birthYearInvalid'))
    .max(new Date().getFullYear() - 16, 'Регистрация только с 16 лет (152-ФЗ)'),
});

// Gender options
const GENDER_OPTIONS = [
  { value: 'male', labelRu: 'Мужской', labelEn: 'Male' },
  { value: 'female', labelRu: 'Женский', labelEn: 'Female' },
];

// Common countries (top used)
const COUNTRIES = [
  { code: 'RU', nameRu: 'Россия', nameEn: 'Russia' },
  { code: 'UA', nameRu: 'Украина', nameEn: 'Ukraine' },
  { code: 'BY', nameRu: 'Беларусь', nameEn: 'Belarus' },
  { code: 'KZ', nameRu: 'Казахстан', nameEn: 'Kazakhstan' },
  { code: 'US', nameRu: 'США', nameEn: 'United States' },
  { code: 'DE', nameRu: 'Германия', nameEn: 'Germany' },
  { code: 'GB', nameRu: 'Великобритания', nameEn: 'United Kingdom' },
  { code: 'IL', nameRu: 'Израиль', nameEn: 'Israel' },
  { code: 'GE', nameRu: 'Грузия', nameEn: 'Georgia' },
  { code: 'AM', nameRu: 'Армения', nameEn: 'Armenia' },
  { code: 'UZ', nameRu: 'Узбекистан', nameEn: 'Uzbekistan' },
  { code: 'AZ', nameRu: 'Азербайджан', nameEn: 'Azerbaijan' },
  { code: 'OTHER', nameRu: 'Другая', nameEn: 'Other' },
];

const Auth = () => {
  const { t, language } = useI18n();
  const { isSignedIn, loading, signIn, signUp, sendPasswordReset, updatePassword, isRecoveryMode } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { emailSchema, passwordSchema, usernameSchema, birthYearSchema } = useMemo(() => buildSchemas(t), [t]);
  
  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [showNewPasswordForm, setShowNewPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  
  // Extended registration fields
  const [gender, setGender] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");

  // Legal consents (registration)
  const [consents, setConsents] = useState<{ offer?: boolean; privacy?: boolean; disclaimer?: boolean; ageConfirmed?: boolean; nameToJiva?: boolean }>({ nameToJiva: true });
  const [consentError, setConsentError] = useState(false);

  // Check for password reset mode or recovery mode from URL hash
  useEffect(() => {
    if (searchParams.get("reset") === "true") {
      setShowResetForm(true);
    }
    
    // Check URL hash for recovery token (Supabase adds #access_token=...&type=recovery)
    const hash = window.location.hash;
    if (hash.includes('type=recovery') || searchParams.get("recovery") === "true" || isRecoveryMode) {
      setShowNewPasswordForm(true);
      setShowResetForm(false);
    }
  }, [searchParams, isRecoveryMode]);

  // Redirect if already authenticated (but not in recovery mode)
  useEffect(() => {
    if (!loading && isSignedIn && !isRecoveryMode && !showNewPasswordForm) {
      navigate('/app');
    }
  }, [isSignedIn, loading, navigate, isRecoveryMode, showNewPasswordForm]);

  // Device performance detection - disable heavy effects on mobile/iOS
  const { isMobile, isIOS, showEffects } = useMemo(() => {
    if (typeof window === 'undefined') return { isMobile: false, isIOS: false, showEffects: true };
    const ua = navigator.userAgent;
    const mobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua) || window.innerWidth < 768;
    const ios = /iPad|iPhone|iPod/.test(ua);
    const devicePerf = getDevicePerformance();
    const isLowPerf = devicePerf === 'low' || shouldUseSimpleEffects();
    // Disable all heavy effects on mobile or iOS to prevent input lag
    const effects = !mobile && !ios && devicePerf === 'high' && !isLowPerf;
    return { isMobile: mobile, isIOS: ios, showEffects: effects };
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    setIsSubmitting(false);

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        toast.error(t('auth.invalidCredentials'));
      } else if (error.message.includes("Email not confirmed")) {
        toast.error(t('auth.errors.emailNotConfirmed'));
      } else {
        toast.error(error.message);
      }
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
      usernameSchema.parse(username);
      if (birthYear) {
        birthYearSchema.parse(parseInt(birthYear, 10));
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
      } else {
        toast.error(t('auth.errors.checkInput'));
      }
      return;
    }

    // Required extended fields (вынесено из try/catch — иначе исполнение продолжалось при ошибке)
    if (!gender) {
      toast.error(t('auth.errors.genderRequired'));
      return;
    }
    if (!birthYear) {
      toast.error(t('auth.errors.birthYearRequired'));
      return;
    }
    if (!country) {
      toast.error(t('auth.errors.countryRequired'));
      return;
    }
    if (!city || city.length < 2) {
      toast.error(t('auth.errors.cityRequired'));
      return;
    }

    // Legal consents required (152-ФЗ + ст. 10 ЗоЗПП)
    if (!validateConsents('registration', consents)) {
      setConsentError(true);
      toast.error(t('auth.errors.consentsRequired'));
      return;
    }
    setConsentError(false);

    setIsSubmitting(true);
    const { error } = await signUp(email, password, username, {
      gender,
      birthYear: parseInt(birthYear, 10),
      country,
      city,
      ageConfirmed: !!consents.ageConfirmed,
      nameToJivaConsent: !!consents.nameToJiva,
    });
    setIsSubmitting(false);

    if (error) {
      if (error.message.includes("already registered")) {
        toast.error(t('auth.emailAlreadyExists'));
      } else {
        toast.error(error.message);
      }
    } else {
      // Log all registration consents (offer + privacy + disclaimer) per 152-ФЗ
      logRegistrationConsents({ nameToJiva: !!consents.nameToJiva }).catch((err) => console.warn('Consent log failed:', err));
      setShowConfirmation(true);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(resetEmail);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setIsSubmitting(true);
    const { error } = await sendPasswordReset(resetEmail);
    setIsSubmitting(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t('auth.errors.resetEmailSent'));
      setShowResetForm(false);
    }
  };

  // Confirmation screen after signup
  const ConfirmationScreen = () => (
    <div className="text-center py-8">
      <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-rose-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_24px_rgba(251,146,60,0.35)]">
        <Mail className="w-8 h-8 text-white" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">
        Проверьте почту
      </h3>
      <p className="text-white/70 mb-6">
        Мы отправили письмо на <span className="text-amber-300">{email}</span>. 
        Перейдите по ссылке для подтверждения аккаунта.
      </p>
      <Button 
        variant="ghost"
        onClick={() => {
          setShowConfirmation(false);
          setActiveTab("signin");
        }}
        className="text-amber-300 hover:text-white"
      >
        Вернуться ко входу
      </Button>
    </div>
  );

  // Handle new password submission (after clicking recovery link)
  const handleNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      passwordSchema.parse(newPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    if (newPassword !== confirmNewPassword) {
      toast.error(t('auth.errors.passwordsDoNotMatch'));
      return;
    }

    setIsSubmitting(true);
    const { error } = await updatePassword(newPassword);
    setIsSubmitting(false);

    if (error) {
      toast.error(t('auth.errors.passwordChangeError') + ': ' + error.message);
    } else {
      toast.success(t('auth.errors.passwordChanged'));
      setShowNewPasswordForm(false);
      setNewPassword("");
      setConfirmNewPassword("");
      navigate('/app');
    }
  };

  // New password form (shown after clicking recovery link in email)
  const NewPasswordForm = () => (
    <form onSubmit={handleNewPassword} className="space-y-4">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_24px_rgba(251,146,60,0.35)]">
          <Lock className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">
          Создайте новый пароль
        </h3>
        <p className="text-white/70 text-sm">
          Введите новый пароль для вашего аккаунта
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="new-password" className="text-white">Новый пароль</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
          <Input
            id="new-password"
            type={showPassword ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Минимум 6 символов"
            className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
            required
            minLength={6}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-new-password" className="text-white">Подтвердите пароль</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
          <Input
            id="confirm-new-password"
            type={showPassword ? "text" : "password"}
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            placeholder="Повторите пароль"
            className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
            required
            minLength={6}
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-95 text-white font-medium py-3 shadow-[0_0_24px_rgba(249,115,22,0.25)] hover:shadow-[0_0_32px_rgba(249,115,22,0.4)] border border-orange-400/20"
      >
        {isSubmitting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          "Сохранить новый пароль"
        )}
      </Button>
    </form>
  );

  // Password reset form (request reset link)
  const ResetPasswordForm = () => (
    <form onSubmit={handlePasswordReset} className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-white mb-2">
          Сброс пароля
        </h3>
        <p className="text-white/70 text-sm">
          Введите email для получения ссылки сброса
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="reset-email" className="text-white">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
          <Input
            id="reset-email"
            type="email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            placeholder="your@email.com"
            className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
            required
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-95 text-white font-medium py-3 shadow-[0_0_24px_rgba(249,115,22,0.25)] hover:shadow-[0_0_32px_rgba(249,115,22,0.4)] border border-orange-400/20"
      >
        {isSubmitting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          "Отправить ссылку"
        )}
      </Button>

      <Button 
        type="button"
        variant="ghost"
        onClick={() => setShowResetForm(false)}
        className="w-full text-white/70 hover:text-white"
      >
        Назад
      </Button>
    </form>
  );

  // Ранний выход: если уже залогинен — не рендерим форму, чтобы не мелькала
  if (!loading && isSignedIn && !isRecoveryMode && !showNewPasswordForm) {
    return (
      <div className="dark min-h-screen bg-[#0A0F18] flex items-center justify-center text-white">
        <Loader2 className="h-6 w-6 animate-spin text-white/70" />
      </div>
    );
  }

  return (
    <div
      className="dark relative min-h-screen overflow-hidden text-white"
      style={{ background: 'radial-gradient(ellipse 120% 80% at 50% 0%, #3a1240 0%, #1a0a2e 35%, #0d0820 70%, #07050f 100%)' }}
    >
      {/* Aurora background - only on desktop non-iOS */}
      {showEffects && (
        <Suspense fallback={null}>
          <AuroraBackground />
        </Suspense>
      )}

      {/* Animated shader - only on high performance desktop */}
      {showEffects && (
        <div className="pointer-events-none absolute inset-0 opacity-35">
          <Suspense fallback={null}>
            <AnimatedShaderBackground />
          </Suspense>
        </div>
      )}

      {/* Warm brand glow for mobile/iOS — matches landing palette */}
      {!showEffects && (
        <div
          className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_15%,rgba(251,146,60,0.18),transparent_60%),radial-gradient(ellipse_60%_40%_at_20%_80%,rgba(244,63,94,0.10),transparent_55%)]"
          aria-hidden="true"
        />
      )}

      {/* Subtle stars (matches landing hero) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {[...Array(18)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${(i * 19 + 7) % 100}%`,
              top: `${(i * 27 + 8) % 90}%`,
              width: `${1 + (i % 3)}px`,
              height: `${1 + (i % 3)}px`,
              opacity: 0.12 + (i % 5) * 0.08,
            }}
          />
        ))}
      </div>
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link to="/">
            <Button 
              variant="ghost" 
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('auth.backToHome')}
            </Button>
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="max-w-md mx-auto">
          <Card className="bg-white/5 backdrop-blur-xl border border-amber-200/10 rounded-3xl p-8 shadow-[0_0_60px_rgba(251,146,60,0.08)]">
            <div className="text-center mb-8">
              <h1 className="font-hero font-medium text-4xl bg-gradient-to-r from-amber-200 via-white to-rose-300 bg-clip-text text-transparent mb-2">
                {t('auth.welcomeTitle')}
              </h1>
              <p className="text-white/70">{t('auth.welcomeSubtitle')}</p>
            </div>

            {showConfirmation ? (
              <ConfirmationScreen />
            ) : showNewPasswordForm ? (
              <NewPasswordForm />
            ) : showResetForm ? (
              <ResetPasswordForm />
            ) : (
              <>
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "signin" | "signup")} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-8 bg-transparent p-1 gap-2">
                    <TabsTrigger
                      value="signin"
                      className="rounded-full border border-white/20 bg-white/5 text-white/70 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500/25 data-[state=active]:to-rose-500/25 data-[state=active]:border-amber-300/40 data-[state=active]:text-white"
                    >
                      {t('auth.signIn')}
                    </TabsTrigger>
                    <TabsTrigger
                      value="signup"
                      className="rounded-full border border-white/20 bg-white/5 text-white/70 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500/25 data-[state=active]:to-rose-500/25 data-[state=active]:border-amber-300/40 data-[state=active]:text-white"
                    >
                      {t('auth.signUp')}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="signin">
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email" className="text-white">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                          <Input
                            id="signin-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signin-password" className="text-white">{t('auth.password') || 'Пароль'}</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                          <Input
                            id="signin-password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowResetForm(true)}
                        className="text-sm text-amber-300 hover:text-white"
                      >
                        Забыли пароль?
                      </button>

                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-95 text-white font-medium py-3 shadow-[0_0_24px_rgba(249,115,22,0.25)] hover:shadow-[0_0_32px_rgba(249,115,22,0.4)] border border-orange-400/20"
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          t('auth.signIn')
                        )}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup">
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-username" className="text-white">
                          {language === 'ru' ? 'Как тебе обращаться?' : 'What should we call you?'}
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                          <Input
                            id="signup-username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder={language === 'ru' ? 'Лиса, Алексей, Кэп…' : 'Fox, Alex, Cap…'}
                            className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                            required
                            maxLength={30}
                          />
                        </div>
                        <p className="text-xs text-white/50 leading-relaxed">
                          {language === 'ru'
                            ? 'Так к тебе будет обращаться Джива и так тебя увидят в сообществе. Можно настоящее имя, можно ник — как комфортно.'
                            : 'This is how Jiva will address you and how others see you in the community. Real name or nickname — whatever feels right.'}
                        </p>
                        {username.trim() && consents.nameToJiva && (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-300/20">
                            <span className="text-base">💬</span>
                            <p className="text-xs text-amber-100">
                              {language === 'ru'
                                ? <>Джива напишет: <span className="font-medium text-white">«Привет, {username.trim()}!»</span></>
                                : <>Jiva will write: <span className="font-medium text-white">"Hi, {username.trim()}!"</span></>}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Gender Selection */}
                      <div className="space-y-2">
                        <Label className="text-white">{language === 'ru' ? 'Пол' : 'Gender'} *</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {GENDER_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setGender(option.value)}
                              className={`px-3 py-2 rounded-lg text-sm transition-all ${
                                gender === option.value
                                  ? 'bg-gradient-to-r from-amber-500/30 to-rose-500/30 text-white border-amber-300/50'
                                  : 'bg-white/10 text-white/70 border-white/20 hover:bg-white/20'
                              } border`}
                            >
                              {language === 'ru' ? option.labelRu : option.labelEn}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Birth Year */}
                      <div className="space-y-2">
                        <Label htmlFor="signup-birthyear" className="text-white">
                          {language === 'ru' ? 'Год рождения' : 'Birth year'} *
                        </Label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                          <Input
                            id="signup-birthyear"
                            type="number"
                            value={birthYear}
                            onChange={(e) => setBirthYear(e.target.value)}
                            placeholder="1990"
                            min="1930"
                            max={new Date().getFullYear() - 13}
                            className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                            required
                          />
                        </div>
                      </div>

                      {/* Country */}
                      <div className="space-y-2">
                        <Label className="text-white">{language === 'ru' ? 'Страна' : 'Country'} *</Label>
                        <Select value={country} onValueChange={setCountry}>
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <MapPin className="w-4 h-4 mr-2 text-white/50" />
                            <SelectValue placeholder={language === 'ru' ? 'Выберите страну' : 'Select country'} />
                          </SelectTrigger>
                          <SelectContent>
                            {COUNTRIES.map((c) => (
                              <SelectItem key={c.code} value={c.code}>
                                {language === 'ru' ? c.nameRu : c.nameEn}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* City */}
                      <div className="space-y-2">
                        <Label htmlFor="signup-city" className="text-white">
                          {language === 'ru' ? 'Город' : 'City'} *
                        </Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                          <Input
                            id="signup-city"
                            type="text"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder={language === 'ru' ? "Ваш город" : "Your city"}
                            className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                            required
                            minLength={2}
                          />
                        </div>
                      </div>

                      {/* Privacy Notice */}
                      <div className="flex items-start gap-2 p-3 bg-white/5 rounded-lg border border-white/10">
                        <Shield className="w-4 h-4 text-amber-300 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-white/60">
                          {language === 'ru' 
                            ? 'Пол, возраст, город и страна никому не видны. Другие пользователи видят только то, как ты попросил(а) себя называть.'
                            : 'Gender, age, city, and country are private. Others only see how you asked to be called.'}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-email" className="text-white">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                          <Input
                            id="signup-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-password" className="text-white">{t('auth.password') || 'Пароль'}</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                          <Input
                            id="signup-password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={language === 'ru' ? "Минимум 6 символов" : "Minimum 6 characters"}
                            className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Legal consents (152-ФЗ + ст. 10 ЗоЗПП) */}
                      <ConsentCheckboxes
                        variant="registration"
                        consents={consents}
                        onChange={setConsents}
                        error={consentError}
                        className="pt-2"
                      />

                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-95 text-white font-medium py-3 shadow-[0_0_24px_rgba(249,115,22,0.25)] hover:shadow-[0_0_32px_rgba(249,115,22,0.4)] border border-orange-400/20"
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          t('auth.signUp')
                        )}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Auth;
