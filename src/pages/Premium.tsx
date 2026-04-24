import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Check, Crown, Shield, 
  Brain, Palette, Clock, Zap, MessageCircle,
  X, MemoryStick, ChevronDown, ChevronUp, Sparkles, Wind, Gift
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SEO from "@/components/SEO";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { usePremiumStatus } from "@/hooks/useEntitlements";
import { usePricing } from "@/hooks/usePricing";
import { cn } from "@/lib/utils";
import { PaymentConsentModal } from "@/components/billing/PaymentConsentModal";
import { PricingToggle } from "@/components/billing/PricingToggle";
import { SubscriptionManager } from "@/components/billing/SubscriptionManager";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PoweredByClaude } from "@/components/landing/PoweredByClaude";

export default function Premium() {
  const navigate = useNavigate();
  const { language } = useI18n();
  const { user } = useAuth();
  const { isPremium: hasPremium, loading: entitlementsLoading } = usePremiumStatus();
  const { 
    premiumMonthly, 
    premiumYearly, 
    yearlySavings, 
    yearlyDiscountPercent, 
    monthlyEquivalent,
    freeMonths,
    loading: pricesLoading 
  } = usePricing();
  const currentPlan = hasPremium ? 'premium' : 'free';
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'premium'>('premium');
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [expandedCard, setExpandedCard] = useState<'free' | 'premium' | null>(null);
  const isRussian = language === 'ru';

  const currentPrice = billingPeriod === 'monthly' ? premiumMonthly : premiumYearly;

  const handleSubscribe = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (selectedPlan === 'premium') {
      setShowConsentModal(true);
    }
  };

  const handlePaymentConfirm = async () => {
    setPaymentLoading(true);
    try {
      const productId = billingPeriod === 'monthly' 
        ? 'premium_subscription_monthly' 
        : 'premium_subscription_yearly';
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          type: 'subscription',
          product: productId,
          priceRub: currentPrice
        }
      });

      if (error) throw error;

      if (data?.confirmationUrl) {
        window.location.href = data.confirmationUrl;
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Не удалось создать платёж');
    } finally {
      setPaymentLoading(false);
      setShowConsentModal(false);
    }
  };

  // Comparison table data with new Дыхание/Опора branding (v2.4.1)
  const comparisonRows = [
    {
      feature: "Суть",
      free: { text: "Знакомство", subtext: "3 бесплатных сообщения с Дживой" },
      premium: { text: "Глубокая работа с состоянием", subtext: "Когда нужно понять причину и найти выход" }
    },
    {
      feature: "Кто рядом",
      free: { text: "—", subtext: "После 3 сообщений Джива на паузе" },
      premium: { text: "Джива — наш AI-психолог", subtext: "Эмпатичная и глубоко человечная" }
    },
    {
      feature: "Диалог",
      free: { text: "3 сообщения", subtext: "Без ограничения по времени" },
      premium: { text: "10 сообщений/день + буфер", subtext: "В тяжёлые дни — ещё +5 сообщений (3 раза в месяц)" }
    },
    {
      feature: "Память",
      free: { text: "С чистого листа", subtext: "Каждый день — новый разговор", icon: X },
      premium: { text: "История души", subtext: "Джива помнит твои переживания, имена и детали", icon: Check }
    },
    {
      feature: "Рисование",
      free: { text: "1 анализ", subtext: "Рисование всегда доступно" },
      premium: { text: "3 анализа в день", subtext: "Полноценная арт-терапия с тёплой интерпретацией" }
    }
  ];

  return (
    <>
      <SEO 
        title="Какую поддержку ты ищешь сегодня?"
        description="Дыхание — скорая помощь в моменте. Опора — глубокая работа с состоянием. От 690₽/мес."
      />

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
          <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-semibold">Тарифы</h1>
            </div>
          </div>
        </header>

        <main className="container max-w-4xl mx-auto px-4 py-8 pb-32 space-y-10">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <h2 className="text-3xl md:text-4xl font-bold">
              Какую поддержку ты ищешь сегодня?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Мы верим, что помощь должна быть доступна каждому. Базовые инструменты всегда бесплатны, а Джива — наш эмпатичный AI-психолог — рядом, когда нужно глубже.
            </p>
            <div className="flex justify-center pt-1">
              <PoweredByClaude variant="muted" />
            </div>
          </motion.div>

          {/* Show subscription manager if user is premium */}
          {user && hasPremium && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <SubscriptionManager />
            </motion.div>
          )}

          {/* Main Pricing Toggle - Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-gradient-to-br from-primary/5 via-background to-violet-500/5 rounded-3xl p-6 md:p-8 border border-border/50"
          >
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium mb-3">
                <Crown className="w-4 h-4" />
                Тариф «Опора»
              </div>
              <h3 className="text-xl font-semibold">Выберите период подписки</h3>
            </div>

            <PricingToggle
              period={billingPeriod}
              onPeriodChange={(period) => {
                setBillingPeriod(period);
                setSelectedPlan('premium');
              }}
              monthlyPrice={premiumMonthly}
              yearlyPrice={premiumYearly}
              loading={pricesLoading}
            />

            {/* Primary CTA after period selection */}
            <Button
              onClick={handleSubscribe}
              disabled={entitlementsLoading || (user && hasPremium)}
              className="w-full h-12 mt-6 text-base rounded-xl bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90"
            >
              <Crown className="w-5 h-5 mr-2" />
              {user 
                ? hasPremium 
                  ? "Вы уже с Опорой ✓" 
                  : `Обрести Опору за ${currentPrice} ₽${billingPeriod === 'yearly' ? '/год' : '/мес'}`
                : "Зарегистрироваться для покупки"
              }
            </Button>
          </motion.div>

          {/* Registration Warning for Unauthorized Users */}
          {!user && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 text-center sm:text-left">
                <Sparkles className="w-5 h-5 text-primary shrink-0" />
                <p className="text-sm">
                  <span className="font-medium">Чтобы оформить подписку,</span>{" "}
                  <span className="text-muted-foreground">сначала создайте аккаунт</span>
                </p>
              </div>
              <Button
                onClick={() => navigate('/auth')}
                size="sm"
                className="shrink-0"
              >
                Зарегистрироваться
              </Button>
            </motion.div>
          )}

          {/* Pricing Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid md:grid-cols-2 gap-4"
          >
            {/* Free Plan - Дыхание */}
            <Card 
              className={cn(
                "p-6 cursor-pointer transition-all border-2 relative",
                selectedPlan === 'free' 
                  ? "border-emerald-500 bg-emerald-500/5" 
                  : "border-transparent hover:border-border"
              )}
              onClick={() => setSelectedPlan('free')}
            >
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                      ДЫХАНИЕ
                    </span>
                    <Wind className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-bold">Тариф «Дыхание»</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Скорая помощь в моменте
                  </p>
                  <p className="text-2xl font-bold mt-3">
                    Бесплатно
                  </p>
                </div>
                
                <div className="pt-4 border-t border-border/50 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 mt-0.5">
                      <Clock className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">3 бесплатных сообщения</p>
                      <p className="text-xs text-muted-foreground">
                        Знакомство с Дживой — без ограничений по времени
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-violet-500/10 mt-0.5">
                      <MessageCircle className="w-4 h-4 text-violet-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Лента «Момент Дня»</p>
                      <p className="text-xs text-muted-foreground">
                        ИИ комментирует каждый пост
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-amber-500/10 mt-0.5">
                      <Zap className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Инструментарий</p>
                      <p className="text-xs text-muted-foreground">
                        SOS, дыхание, дневник без ограничений
                      </p>
                    </div>
                  </div>
                </div>

                {/* Expandable details */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedCard(expandedCard === 'free' ? null : 'free');
                  }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {expandedCard === 'free' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  Подробнее
                </button>

                <AnimatePresence>
                  {expandedCard === 'free' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 rounded-xl bg-muted/30 space-y-3">
                        <p className="text-sm italic text-muted-foreground">
                          «Иногда, чтобы пережить день, нужно просто знать, что тебя слышат.»
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Этот тариф мы создали, чтобы никто не оставался с тревогой один на один.
                        </p>
                        <ul className="text-xs text-muted-foreground space-y-1.5">
                          <li><span className="text-emerald-500">•</span> Знакомство с Дживой: 3 тёплых сообщения — почувствуй, какая она</li>
                          <li><span className="text-emerald-500">•</span> Поддержка рядом: SOS, дыхание, заземление, сообщество — без лимитов</li>
                          <li><span className="text-emerald-500">•</span> Без обязательств: пространство «здесь и сейчас», без давления</li>
                        </ul>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {currentPlan === 'free' && (
                  <div className="text-xs text-emerald-500 font-medium pt-2">
                    ✓ Текущий план
                  </div>
                )}
              </div>
            </Card>

            {/* Premium Plan - Опора */}
            <Card 
              className={cn(
                "p-6 cursor-pointer transition-all border-2 relative overflow-hidden",
                selectedPlan === 'premium' 
                  ? "border-primary bg-primary/5" 
                  : "border-transparent hover:border-border"
              )}
              onClick={() => setSelectedPlan('premium')}
            >
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      ОПОРА
                    </span>
                    <Crown className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">Тариф «Опора»</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Глубокая работа с состоянием
                  </p>
                  
                  <div className="mt-3">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={billingPeriod}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <p className="text-2xl font-bold">
                          {currentPrice} ₽
                          <span className="text-sm font-normal text-muted-foreground">
                            /{billingPeriod === 'monthly' ? 'мес' : 'год'}
                          </span>
                        </p>
                        {billingPeriod === 'yearly' && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground line-through">
                              {premiumMonthly * 12} ₽
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-500 font-medium">
                              <Gift className="w-3 h-3" />
                              Экономия {yearlySavings} ₽
                            </span>
                          </div>
                        )}
                        {billingPeriod === 'yearly' && (
                          <p className="text-xs text-primary font-medium mt-1">
                            = {monthlyEquivalent} ₽/мес
                          </p>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Anchoring Block - сравнение с психологом */}
                  <div className="mt-4 pt-3 border-t border-border/30 text-center">
                    <p className="text-xs text-muted-foreground">
                      <span className="line-through opacity-60">1 сессия с психологом: 3000–5000 ₽</span>
                    </p>
                    <p className="text-xs text-primary/80 mt-1">
                      Опора на месяц = {Math.round(premiumMonthly / 30)} ₽/день ≈ цена кофе
                    </p>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-border/50 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-primary/10 mt-0.5">
                      <Brain className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">💙 Джива — твой AI-психолог</p>
                      <p className="text-xs text-muted-foreground">
                        Эмпатичная и глубоко человечная
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 mt-0.5">
                      <Zap className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">⚡ 10 глубоких разговоров в день</p>
                      <p className="text-xs text-muted-foreground">
                        +5 сообщений в трудные дни (3 раза в месяц)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-violet-500/10 mt-0.5">
                      <MemoryStick className="w-4 h-4 text-violet-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">🧩 История души</p>
                      <p className="text-xs text-muted-foreground">
                        Джива помнит имена, детали и прошлые переживания
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-pink-500/10 mt-0.5">
                      <Palette className="w-4 h-4 text-pink-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">🎨 Арт-терапия — 3 в день</p>
                      <p className="text-xs text-muted-foreground">
                        Тёплый анализ рисунков от Дживы
                      </p>
                    </div>
                  </div>
                </div>

                {/* Expandable details */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedCard(expandedCard === 'premium' ? null : 'premium');
                  }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {expandedCard === 'premium' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  Подробнее
                </button>

                <AnimatePresence>
                  {expandedCard === 'premium' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
                        <p className="text-sm italic text-primary/90">
                          «Для тех, кто готов не просто успокоиться, а разобраться в себе.»
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Джива — наш эмпатичный AI-психолог. Карманная поддержка, которая помнит и слышит.
                        </p>
                        <ul className="text-xs text-muted-foreground space-y-1.5">
                          <li><span className="text-primary">•</span> Глубокий разговор: Джива думает прежде чем ответить и слышит то, что между строк</li>
                          <li><span className="text-primary">•</span> Память: Джива запомнит, что тебя беспокоило неделю назад</li>
                          <li><span className="text-primary">•</span> Рисунки: присылай хоть каждый день — Джива увидит то, что трудно сказать словами</li>
                        </ul>
                        <div className="pt-1">
                          <PoweredByClaude variant="muted" />
                        </div>
                        <p className="text-xs text-primary font-medium pt-2">
                          Цена чашки кофе за месяц спокойствия ☕
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {currentPlan === 'premium' && (
                  <div className="text-xs text-primary font-medium">
                    ✓ Текущий план
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          {/* CTA after plan cards */}
          {selectedPlan === 'premium' && !hasPremium && user && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <Button
                onClick={handleSubscribe}
                disabled={entitlementsLoading}
                className="h-12 px-8 text-base rounded-xl bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90"
              >
                <Crown className="w-5 h-5 mr-2" />
                Обрести Опору за {currentPrice} ₽{billingPeriod === 'yearly' ? '/год' : '/мес'}
              </Button>
            </motion.div>
          )}

          {/* Comparison Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-semibold text-center">
              Сравнение возможностей
            </h3>
            
            <div className="rounded-2xl border border-border overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-3 bg-muted/50 border-b border-border">
                <div className="p-4 font-medium text-sm">Возможности</div>
                <div className="p-4 text-center font-medium text-sm text-emerald-500">ДЫХАНИЕ (0 ₽)</div>
                <div className="p-4 text-center font-medium text-sm text-primary">ОПОРА (от {premiumMonthly} ₽)</div>
              </div>
              
              {/* Table Rows */}
              {comparisonRows.map((row, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "grid grid-cols-3",
                    idx !== comparisonRows.length - 1 && "border-b border-border"
                  )}
                >
                  <div className="p-4 text-sm font-medium">{row.feature}</div>
                  <div className="p-4 text-center text-sm">
                    <div className="flex flex-col items-center gap-1">
                      {row.free.icon && (
                        <row.free.icon className={cn(
                          "w-4 h-4",
                          row.free.icon === X ? "text-muted-foreground" : "text-emerald-500"
                        )} />
                      )}
                      <span className={cn(
                        row.free.icon === X && "text-muted-foreground"
                      )}>
                        {row.free.text}
                      </span>
                      {row.free.subtext && (
                        <span className="text-xs text-muted-foreground">{row.free.subtext}</span>
                      )}
                    </div>
                  </div>
                  <div className="p-4 text-center text-sm bg-primary/5">
                    <div className="flex flex-col items-center gap-1">
                      {row.premium.icon && (
                        <row.premium.icon className="w-4 h-4 text-emerald-500" />
                      )}
                      <span className="text-primary font-medium">{row.premium.text}</span>
                      {row.premium.subtext && (
                        <span className="text-xs text-muted-foreground">{row.premium.subtext}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Final CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="text-center space-y-4"
          >
            <Button
              onClick={handleSubscribe}
              disabled={entitlementsLoading || (user && hasPremium)}
              className="h-14 px-10 text-lg rounded-xl bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90"
            >
              <Crown className="w-5 h-5 mr-2" />
              {user 
                ? hasPremium 
                  ? "Вы уже с Опорой ✓" 
                  : `Обрести Опору за ${currentPrice} ₽${billingPeriod === 'yearly' ? '/год' : '/мес'}`
                : "Зарегистрироваться для покупки"
              }
            </Button>
            {billingPeriod === 'yearly' && yearlySavings > 0 && (
              <p className="text-sm text-emerald-500 flex items-center justify-center gap-2">
                <Gift className="w-4 h-4" />
                Экономия {yearlySavings} ₽ — это {freeMonths} месяца бесплатно
              </p>
            )}
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Безопасная оплата
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Отмена в любой момент
            </div>
          </motion.div>
        </main>

        {/* Payment Consent Modal */}
        <PaymentConsentModal
          open={showConsentModal}
          onClose={() => setShowConsentModal(false)}
          onConfirm={handlePaymentConfirm}
          loading={paymentLoading}
          productName={billingPeriod === 'monthly' ? 'Опора (месяц)' : 'Опора (год)'}
          price={currentPrice}
        />

      </div>
    </>
  );
}
