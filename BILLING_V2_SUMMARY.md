# Billing & Plans v2 — Итоговая сводка

## ✅ Реализовано

### 1. Конфигурация и управление ценами
- **src/config/plans.ts** — централизованная конфигурация Free/Premium/Plus
- **src/lib/costs.ts** — COGS-модели для LLM/voice
- **.env.local.example** — все цены редактируются через ENV без кода

### 2. База данных
- Миграция создала 3 таблицы: `usage_counters`, `jiva_sessions`, обновила `subscriptions` и `payments`
- RLS-политики настроены
- Функция очистки старых счётчиков

### 3. Квоты и использование
- **src/lib/usage.ts** — проверка лимитов Jiva (weekly) и Navigator (daily)
- Логика микропокупок (extra sessions)

### 4. Платёжные функции
- **supabase/functions/create-checkout/index.ts** — создание платежей через ЮKassa
- **supabase/functions/yookassa-webhook/index.ts** — обработка успешных оплат
- Поддержка subscription и jiva_extra продуктов

### 5. UI компоненты
- **src/components/billing/PlanCard.tsx** — карточки планов
- **src/components/billing/PaywallModal.tsx** — модалка с предложением upgrade + микропокупка
- **src/pages/Pricing.tsx** — страница тарифов

### 6. i18n (ru.json)
- Добавлен полный раздел `billing.*`
- Все тексты на русском: заголовки, описания, CTA

## 🔧 ENV-переменные для редактирования цен

```bash
VITE_PRICE_PREMIUM_RUB=1190
VITE_PRICE_EXTRA_JIVA_RUB=79
VITE_PRICE_PLUS_RUB=699
VITE_ENABLE_PLUS=false
VITE_ENABLE_TRIAL_7D=false
VITE_BILLING_PROVIDER=yookassa
```

## 📋 Требуется доделать

1. **Интеграция в существующие компоненты**:
   - Обновить JivaCard/JivaModal для проверки квот через `canStartJivaSession()`
   - Добавить PaywallModal при исчерпании лимитов
   - Researcher — добавить счётчик `canUseNavigator()` и показ лимита

2. **Обновить Premium.tsx**:
   - Заменить старые карточки на `<PlanCard>` из конфига
   - Убрать хардкод цен
   - Переключить на новый create-checkout

3. **Секреты ЮKassa**:
   - Добавить через tools: `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY`

4. **Admin panel** (опционально):
   - src/pages/admin/billing.tsx — визуальный редактор квот

5. **Тестирование**:
   - Free user: 1 сессия → paywall → микропокупка
   - Premium: 2 сессии + voice работают
   - Navigator: лимиты отображаются корректно

## 🎯 Как переключить Plus

```bash
VITE_ENABLE_PLUS=true
```
Plus появится на /pricing автоматически.

## 📦 Файлы созданы/изменены

- src/config/plans.ts
- src/lib/costs.ts  
- src/lib/usage.ts
- src/components/billing/PlanCard.tsx
- src/components/billing/PaywallModal.tsx
- src/pages/Pricing.tsx
- supabase/functions/create-checkout/index.ts
- supabase/functions/yookassa-webhook/index.ts (обновлён)
- src/i18n/ru.json (добавлен billing.*)
- .env.local.example
- DB migration (usage_counters, jiva_sessions)

## 🚀 Следующий шаг

Интегрировать PaywallModal в JivaModal и Researcher, заменить старый Premium UI на новые карточки.
