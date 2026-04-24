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

// Validation schemas
const emailSchema = z.string().email("Неверный формат email");
const passwordSchema = z.string().min(6, "Минимум 6 символов");
const usernameSchema = z.string().min(2, "Минимум 2 символа").max(30, "Максимум 30 символов");
const birthYearSchema = z.number()
  .min(1930, "Некорректный год")
  .max(new Date().getFullYear() - 13, "Минимальный возраст — 13 лет");

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
        toast.error("Неверный email или пароль");
      } else if (error.message.includes("Email not confirmed")) {
        toast.error("Подтвердите email для входа");
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
      
      // Validate birth year if provided
      if (birthYear) {
        birthYearSchema.parse(parseInt(birthYear, 10));
      }
      
      // Validate required fields
      if (!gender) {
        toast.error(language === 'ru' ? 'Укажите пол' : 'Please select gender');
        return;
      }
      if (!birthYear) {
        toast.error(language === 'ru' ? 'Укажите год рождения' : 'Please enter birth year');
        return;
      }
      if (!country) {
        toast.error(language === 'ru' ? 'Укажите страну' : 'Please select country');
        return;
      }
      if (!city || city.length < 2) {
        toast.error(language === 'ru' ? 'Укажите город (минимум 2 символа)' : 'Please enter city (min 2 characters)');
        return;
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setIsSubmitting(true);
    const { error } = await signUp(email, password, username, {
      gender,
      birthYear: parseInt(birthYear, 10),
      country,
      city,
    });
    setIsSubmitting(false);

    if (error) {
      if (error.message.includes("already registered")) {
        toast.error("Этот email уже зарегистрирован");
      } else {
        toast.error(error.message);
      }
    } else {
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
      toast.success("Письмо для сброса пароля отправлено");
      setShowResetForm(false);
    }
  };

  // Confirmation screen after signup
  const ConfirmationScreen = () => (
    <div className="text-center py-8">
      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
        <Mail className="w-8 h-8 text-white" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">
        Проверьте почту
      </h3>
      <p className="text-white/70 mb-6">
        Мы отправили письмо на <span className="text-purple-300">{email}</span>. 
        Перейдите по ссылке для подтверждения аккаунта.
      </p>
      <Button 
        variant="ghost"
        onClick={() => {
          setShowConfirmation(false);
          setActiveTab("signin");
        }}
        className="text-purple-300 hover:text-white"
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
      toast.error("Пароли не совпадают");
      return;
    }

    setIsSubmitting(true);
    const { error } = await updatePassword(newPassword);
    setIsSubmitting(false);

    if (error) {
      toast.error("Ошибка при смене пароля: " + error.message);
    } else {
      toast.success("Пароль успешно изменён");
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
        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
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
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white font-bold py-3"
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
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white font-bold py-3"
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
    <div className="dark relative min-h-screen overflow-hidden bg-[#0A0F18] text-white">
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
      
      {/* Simple gradient fallback for mobile/iOS */}
      {!showEffects && (
        <div 
          className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-br from-purple-900/30 via-background to-blue-900/20"
          aria-hidden="true"
        />
      )}
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        <Link to="/">
          <Button 
            variant="ghost" 
            className="mb-8 text-white/70 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('auth.backToHome')}
          </Button>
        </Link>

        <div className="max-w-md mx-auto">
          <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">{t('auth.welcomeTitle')}</h1>
              <p className="text-purple-200/80">{t('auth.welcomeSubtitle')}</p>
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
                      className="rounded-full border border-white/20 bg-white/10 data-[state=active]:bg-white/20 data-[state=active]:border-white/30 text-white/80 data-[state=active]:text-white"
                    >
                      {t('auth.signIn')}
                    </TabsTrigger>
                    <TabsTrigger 
                      value="signup" 
                      className="rounded-full border border-white/20 bg-transparent data-[state=active]:bg-white/20 data-[state=active]:border-white/30 text-white/60 data-[state=active]:text-white"
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
                        className="text-sm text-purple-300 hover:text-white"
                      >
                        Забыли пароль?
                      </button>

                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white font-bold py-3"
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
                        <Label htmlFor="signup-username" className="text-white">{t('auth.username') || 'Имя'}</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                          <Input
                            id="signup-username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder={language === 'ru' ? "Как тебя зовут?" : "What's your name?"}
                            className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                            required
                          />
                        </div>
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
                                  ? 'bg-purple-500 text-white border-purple-400'
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
                        <Shield className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-white/60">
                          {language === 'ru' 
                            ? 'Пол, возраст, город и страна никому не видны. Другие пользователи видят только твоё имя.'
                            : 'Gender, age, city, and country are private. Other users can only see your name.'}
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

                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white font-bold py-3"
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

                <p className="text-xs text-center text-white/65 mt-6">
                  {t('auth.termsAgreement')}{" "}
                  <Link to="/legal/privacy" className="underline hover:text-white">
                    {t('auth.privacyPolicy')}
                  </Link>{" "}
                  {t('common.and')}{" "}
                  <Link to="/legal/offer" className="underline hover:text-white">
                    {t('auth.termsOfService')}
                  </Link>
                </p>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Auth;
