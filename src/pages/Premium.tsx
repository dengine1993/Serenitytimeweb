import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Check, Crown, Shield,
  Brain, Palette, Clock, Zap, MessageCircle,
  X, MemoryStick, ChevronDown, ChevronUp, Sparkles, Wind
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { usePremiumStatus } from "@/hooks/useEntitlements";
import { usePricing } from "@/hooks/usePricing";
import { JIVA_CHAT_LIMITS } from "@/config/jivaLimits";
import { cn } from "@/lib/utils";
import { PaymentConsentModal } from "@/components/billing/PaymentConsentModal";
import { SubscriptionManager } from "@/components/billing/SubscriptionManager";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { openExternalUrl } from "@/lib/openExternalUrl";


export default function Premium() {
  const navigate = useNavigate();
  const { language } = useI18n();
  const { user } = useAuth();
  const { isPremium: hasPremium, loading: entitlementsLoading } = usePremiumStatus();
  const { premiumMonthly } = usePricing();
  const currentPlan = hasPremium ? 'premium' : 'free';
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'premium'>('premium');
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [expandedCard, setExpandedCard] = useState<'free' | 'premium' | null>(null);

  const currentPrice = premiumMonthly;

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
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          type: 'subscription',
          product: 'premium_subscription_monthly',
          priceRub: currentPrice
        }
      });

      if (error) throw error;

      if (data?.confirmationUrl) {
        await openExternalUrl(data.confirmationUrl);
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Не удалось создать платёж');
    } finally {
      setPaymentLoading(false);
      setShowConsentModal(false);
    }
  };

  const freeDeep = JIVA_CHAT_LIMITS.freeDeepTotalLimit;
  const freeFast = JIVA_CHAT_LIMITS.freeFastDailyLimit;
  const premiumDaily = JIVA_CHAT_LIMITS.premiumDailyLimit;

  const comparisonRows = [
    {
      feature: "Суть",
      free: { text: "Знакомство", subtext: `${freeDeep} глубоких сообщений с Дживой, потом ${freeFast}/день в быстром режиме` },
      premium: { text: "Глубокая работа с состоянием", subtext: "Когда нужно понять причину и найти выход" }
    },
    {
      feature: "Кто рядом",
      free: { text: "Джива в лёгком режиме", subtext: `После ${freeDeep} глубоких — переход в Jiva Fast` },
      premium: { text: "Джива — твой Друг 24/7", subtext: "Тёплая, эмпатичная, всегда рядом" }
    },
    {
      feature: "Диалог",
      free: { text: `${freeDeep} глубоких + ${freeFast}/день`, subtext: "Сначала Deep, потом Fast" },
      premium: { text: `${premiumDaily} сообщений/день`, subtext: "Глубокий режим без переключений" }
    },
    {
      feature: "Память",
      free: { text: "С чистого листа", subtext: "Каждый день — новый разговор", icon: X },
      premium: { text: "Помнит контекст", subtext: "Джива помнит важные детали, чтобы лучше тебя понимать", icon: Check }
    },
    {
      feature: "Образ дня",
      free: { text: "1 рисунок для знакомства", subtext: "Рисование всегда доступно" },
      premium: { text: "3 рисунка в день", subtext: "Тёплый отклик Дживы на твой образ" }
    }
  ];

  return (
    <>
      <SEO
        title="Какую поддержку ты ищешь сегодня?"
        description={`Free — скорая помощь в моменте. Premium — глубокая работа с состоянием. ${premiumMonthly} ₽/мес.`}
      />

      <div className="min-h-screen bg-sunrise-ambient">
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
              Мы верим, что забота должна быть доступна каждому. Базовые инструменты всегда бесплатны, а Джива — твой тёплый Друг внутри приложения — рядом, когда хочется поговорить.
            </p>
            <p className="text-[10px] text-muted-foreground/70 max-w-md mx-auto leading-relaxed pt-2">
              ИИ-собеседник • 18+ • Не заменяет врача и психолога • При угрозе жизни — 112
            </p>
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

          {/* Hero Pricing — only monthly */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-gradient-to-br from-orange-500/12 via-rose-500/8 to-amber-400/12 rounded-3xl p-6 md:p-8 border border-orange-400/25 shadow-[0_30px_80px_-20px_rgba(249,115,22,0.35)]"
          >
            <div className="text-center mb-6 space-y-3">
              <div className="inline-flex items-center gap-2 bg-amber-500/15 text-amber-300 px-3 py-1 rounded-full text-sm font-medium border border-amber-400/30">
                <Crown className="w-4 h-4" />
                Тариф Premium
              </div>
              <div>
                <p className="text-4xl font-bold">
                  {currentPrice} ₽
                  <span className="text-base font-normal text-muted-foreground">/мес</span>
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Отмена в любой момент. Доступ сохраняется до конца оплаченного периода.
                </p>
              </div>
            </div>

            <Button
              onClick={handleSubscribe}
              disabled={entitlementsLoading || (user && hasPremium)}
              className="w-full h-12 text-base rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white border border-orange-300/30 shadow-[0_0_28px_rgba(249,115,22,0.5)]"
            >
              <Crown className="w-5 h-5 mr-2" />
              {user
                ? hasPremium
                  ? "Вы уже с Premium ✓"
                  : `Перейти на Premium за ${currentPrice} ₽/мес`
                : "Зарегистрироваться для покупки"
              }
            </Button>
          </motion.div>

          {/* Registration warning */}
          {!user && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-500/10 border border-amber-400/25 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 text-center sm:text-left">
                <Sparkles className="w-5 h-5 text-amber-300 shrink-0" />
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
            {/* Free Plan — Дыхание */}
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
                      <p className="font-medium text-sm">{freeDeep} глубоких + {freeFast} быстрых/день</p>
                      <p className="text-xs text-muted-foreground">
                        Сначала {freeDeep} глубоких сообщений на знакомство — потом Jiva Fast
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
                          Этот тариф — для тех, кто хочет идти глубже и быстрее в своём росте.
                        </p>
                        <ul className="text-xs text-muted-foreground space-y-1.5">
                          <li><span className="text-emerald-500">•</span> Знакомство с Дживой: 10 тёплых сообщений — почувствуй, какая она</li>
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

            {/* Premium Plan — Опора */}
            <Card
              className={cn(
                "p-6 cursor-pointer transition-all border-2 relative overflow-hidden",
                selectedPlan === 'premium'
                  ? "border-orange-400/55 bg-gradient-to-br from-orange-500/8 via-rose-500/5 to-amber-400/8 shadow-[0_20px_60px_-20px_rgba(249,115,22,0.4)]"
                  : "border-transparent hover:border-orange-400/30"
              )}
              onClick={() => setSelectedPlan('premium')}
            >
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-500/15 text-amber-300 border border-orange-400/30">
                      ОПОРА
                    </span>
                    <Crown className="w-3.5 h-3.5 text-amber-300" />
                  </div>
                  <h3 className="text-xl font-bold">Тариф Premium</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Глубокая работа с состоянием
                  </p>

                  <div className="mt-3">
                    <p className="text-2xl font-bold">
                      {currentPrice} ₽
                      <span className="text-sm font-normal text-muted-foreground">/мес</span>
                    </p>
                  </div>

                  {/* Anchoring Block */}
                  <div className="mt-4 pt-3 border-t border-border/30 text-center">
                    <p className="text-xs text-muted-foreground">
                      <span className="line-through opacity-60">Чашка кофе в день: ~150 ₽ × 30 = 4500 ₽</span>
                    </p>
                    <p className="text-xs text-amber-300 mt-1">
                      Premium на месяц = {Math.round(premiumMonthly / 30)} ₽/день — дешевле кофе
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-orange-500/15 mt-0.5">
                      <Brain className="w-4 h-4 text-amber-300" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">💙 Джива — твой Друг 24/7</p>
                      <p className="text-xs text-muted-foreground">
                        Тёплая поддержка в трудные моменты
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 mt-0.5">
                      <Zap className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">⚡ {premiumDaily} глубоких разговоров в день</p>
                      <p className="text-xs text-muted-foreground">
                        Без переключения в быстрый режим — Jiva Deep весь день
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-rose-500/15 mt-0.5">
                      <MemoryStick className="w-4 h-4 text-rose-300" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">🧩 Помнит контекст</p>
                      <p className="text-xs text-muted-foreground">
                        Джива помнит важные детали, чтобы лучше тебя понимать
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-pink-500/15 mt-0.5">
                      <Palette className="w-4 h-4 text-pink-300" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">🎨 «Образ дня» — 3 в день</p>
                      <p className="text-xs text-muted-foreground">
                        Тёплый отклик Дживы на твой рисунок
                      </p>
                    </div>
                  </div>
                </div>

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
                      <div className="p-4 rounded-xl bg-orange-500/8 border border-orange-400/25 space-y-3">
                        <p className="text-sm italic text-amber-200/95">
                          «Для тех, кто готов не просто успокоиться, а разобраться в себе.»
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Джива — твой тёплый Друг внутри «Восхода». Карманная поддержка, которая помнит контекст и слышит между строк.
                        </p>
                        <ul className="text-xs text-muted-foreground space-y-1.5">
                          <li><span className="text-amber-300">•</span> Глубокий разговор: Джива думает прежде чем ответить и слышит то, что между строк</li>
                          <li><span className="text-amber-300">•</span> Память контекста: Джива помнит, что тебя волновало неделю назад</li>
                          <li><span className="text-amber-300">•</span> Рисунки: присылай хоть каждый день — Джива увидит то, что трудно сказать словами</li>
                        </ul>
                        <p className="text-xs text-amber-300 font-medium pt-2">
                          Цена чашки кофе за месяц спокойствия ☕
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {currentPlan === 'premium' && (
                  <div className="text-xs text-amber-300 font-medium">
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
                className="h-12 px-8 text-base rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white border border-orange-300/30 shadow-[0_0_28px_rgba(249,115,22,0.5)]"
              >
                <Crown className="w-5 h-5 mr-2" />
                Перейти на Premium за {currentPrice} ₽/мес
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
              <div className="grid grid-cols-3 bg-muted/50 border-b border-border">
                <div className="p-4 font-medium text-sm">Возможности</div>
                <div className="p-4 text-center font-medium text-sm text-emerald-500">ДЫХАНИЕ (0 ₽)</div>
                <div className="p-4 text-center font-medium text-sm text-amber-300">ОПОРА ({premiumMonthly} ₽/мес)</div>
              </div>

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
                  <div className="p-4 text-center text-sm bg-orange-500/8">
                    <div className="flex flex-col items-center gap-1">
                      {row.premium.icon && (
                        <row.premium.icon className="w-4 h-4 text-amber-300" />
                      )}
                      <span className="text-amber-200 font-medium">{row.premium.text}</span>
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
              className="h-14 px-10 text-lg rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white border border-orange-300/30 shadow-[0_0_32px_rgba(249,115,22,0.55)]"
            >
              <Crown className="w-5 h-5 mr-2" />
              {user
                ? hasPremium
                  ? "Вы уже с Premium ✓"
                  : `Перейти на Premium за ${currentPrice} ₽/мес`
                : "Зарегистрироваться для покупки"
              }
            </Button>
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
          productName="Premium (месяц)"
          price={currentPrice}
        />

      </div>
    </>
  );
}
