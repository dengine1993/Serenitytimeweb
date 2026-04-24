# Business Plan v2.4 - Implementation Summary

## ✅ Completed Implementation

### 1. Database Schema
- ✅ `researcher_usage_daily` - tracks daily Researcher message usage with top-up support
- ✅ `jiva_sessions_v2` - tracks Jiva sessions (weekly/extra) with status management
- ✅ `app_config` - centralized config for pricing, FX, and feature limits
- ✅ `referrals_v2` - referral system with inviter rewards and invitee discounts
- ✅ `payments` - payment tracking with YooKassa integration
- ✅ `price_tests` - A/B testing for Premium pricing

### 2. Pricing Model (config/finmodel/cost_config_v2_4.json)
```json
{
  "premium_monthly": "890 RUB (A/B: 790/890/990)",
  "annual_discount": "16.7% (10 months)",
  "jiva_extra": "59 RUB",
  "researcher_topup_100": "49 RUB",
  "referral_discount": "30% на первый месяц"
}
```

### 3. Feature Limits
- **Free Tier:**
  - Researcher: 20 сообщений/день
  - Jiva: только текст, 1 диалог/неделю
  
- **Premium Tier:**
  - Researcher: 200 сообщений/день
  - Jiva: голос + текст, 1 диалог/неделю
  - Можно купить extra Jiva диалоги (59 ₽)

### 4. Edge Functions
- ✅ `create-checkout` - создание платежей YooKassa с реферальной скидкой
- ✅ `yookassa-webhook-v2` - обработка вебхуков:
  - Premium подписка → создание/продление subscription
  - Jiva extra → создание доступной сессии
  - Researcher top-up → добавление +100 сообщений на сегодня
  - Referral rewards → +7 дней Premium инвайтеру

### 5. React Components & Hooks

#### Hooks
- `useResearcherQuota()` - проверка лимитов и остатка сообщений
- `useJivaSessions()` - проверка доступных сессий (weekly/extra)
- `usePremiumStatus()` - проверка Premium статуса
- `useEntitlements.ts` - библиотека для проверки прав доступа

#### Components
- `TopUpModal` - покупка +100 сообщений Researcher
- `PaywallModal` - показ платной стены с планами
- `JivaCard` - карточка Jivы с динамическими кнопками
- `PricingPage` - страница тарифов с A/B тестированием
- `ReferralPage` - страница реферальной программы
- `ReferralLanding` - лендинг для приглашенных
- `PaymentSuccess` - страница успешной оплаты
- `MonetizationPanel` - админка для управления ценами

### 6. Analytics Events
```typescript
'ab_assignment_pricing' // назначение A/B группы
'checkout_init'         // начало чекаута
'payment_success'       // успешная оплата
'premium_started'       // активация Premium
'jiva_weekly_play'      // использование еженедельного Jiva
'researcher_msg_sent'   // отправка сообщения Researcher
'limits_reached_researcher' // достижение лимита
'referral_link_copied'  // копирование реф. ссылки
'referral_link_visited' // переход по реф. ссылке
```

### 7. FX Guard Logic (`src/lib/fxGuard.ts`)
- Защита от скачков курса валют
- Hysteresis 5% для предотвращения частых изменений
- Markup 5-10% на USD/RUB курс

### 8. Routes
- `/premium` - страница Premium
- `/pricing` - страница тарифов с A/B
- `/referral` - реферальная программа
- `/r/:code` - реферальный лендинг
- `/payment/success` - успешная оплата

## 🔄 User Flows

### Premium Subscription Flow
1. User clicks "Оформить Premium" → `/pricing`
2. System assigns A/B pricing (790/890/990 RUB)
3. User selects monthly/annual plan
4. Checks for referral discount (30% if first payment)
5. Redirects to YooKassa payment
6. Webhook processes payment → activates Premium

### Researcher Top-Up Flow
1. User reaches daily limit (20 for Free, 200 for Premium)
2. `TopUpModal` shows "+100 сообщений за 49 ₽"
3. User buys → creates payment
4. Webhook reduces `messages_count` by 100 (allows 100 more today)

### Jiva Extra Dialog Flow
1. Premium user uses weekly session
2. `JivaCard` shows "Внеочередной диалог — 59 ₽"
3. User buys → creates payment
4. Webhook creates `jiva_sessions_v2` with type='extra', status='available'
5. User can use extra session

### Referral Flow
1. User A generates referral code in `/referral`
2. Shares link `/r/:code` with User B
3. User B registers → code applied to `referrals_v2`
4. User B buys Premium → gets 30% discount
5. Webhook grants User A +7 days Premium

## 📊 Config Management

### app_config Table
```json
{
  "premium_price_rub_current": 890,
  "ab_enabled": true,
  "ab_arms_rub": [790, 890, 990],
  "annual_discount_factor": 0.833,
  "fx_usd_rub": 82.0,
  "fx_markup": 0.20,
  "fx_hysteresis_pct": 0.05,
  "researcher_free_daily": { "limit": 20 },
  "researcher_premium_daily": { "limit": 200 },
  "jiva_extra_price_rub": 59
}
```

Admins can update via `/admin` → Monetization tab

## 🔐 Security & RLS
- All tables have proper RLS policies
- Users can only read/write their own data
- Service role used for webhook operations
- Referral codes validated before application

## 💰 Revenue Metrics
Track via:
- `payments` table for all transactions
- `subscriptions` for MRR/ARR
- `referrals_v2` for viral growth
- `price_tests` for A/B pricing performance
- Analytics events for funnel analysis

## 🚀 Next Steps (Optional)
- [ ] Email notifications for payment confirmation
- [ ] Push notifications for weekly Jiva availability
- [ ] Subscription auto-renewal reminders
- [ ] Referral leaderboard
- [ ] Usage analytics dashboard for users
