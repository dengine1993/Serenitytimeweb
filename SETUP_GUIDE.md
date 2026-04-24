# Руководство по настройке платформы "Безмятежные"

## ✅ Выполнено

### 1. Базовая инфраструктура
- ✅ PWA (Progressive Web App) с offline поддержкой
- ✅ 12 таблиц базы данных с RLS политиками
- ✅ 6 Edge Functions для модерации и уведомлений
- ✅ SEO оптимизация (meta tags, Open Graph, структурированные данные)
- ✅ Анимации переходов между страницами (Framer Motion)

### 2. Функциональность
- ✅ Soul Matching - AI-подбор людей с похожим опытом
- ✅ AI Навигатор - персональный AI-ассистент (24/7)
- ✅ Приватные чаты с typing indicators и read receipts
- ✅ Лента сообщества с infinite scroll
- ✅ Дневник эмоций с экспортом в CSV
- ✅ Кризисный режим с техниками помощи
- ✅ Система достижений и геймификация
- ✅ Блог, события, челленджи, стена поддержки
- ✅ Каталог специалистов
- ✅ Админ-панель с аналитикой
- ✅ Модерация контента через AI

### 3. Техники помощи
- ✅ Дыхательные упражнения (4-7-8)
- ✅ Техника заземления 5-4-3-2-1
- ✅ Экстренные контакты

## 📋 Требуется ручная настройка

### 1. Google OAuth (Рекомендуется)

#### Шаг 1: Google Cloud Console
1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Перейдите в **APIs & Services** → **Credentials**
4. Нажмите **Create Credentials** → **OAuth Client ID**
5. Выберите тип приложения: **Web application**

#### Шаг 2: Настройка OAuth
**Authorized JavaScript origins:**
```
https://bezmyatezhnye.lovable.app
http://localhost:3000 (для тестирования)
```

**Authorized redirect URLs:**
```
https://qdulrlhiuldixxcnqlzb.supabase.co/auth/v1/callback
```

#### Шаг 3: Lovable Cloud
1. Откройте Lovable Cloud Dashboard (кнопка ниже)
2. Перейдите в **Users** → **Auth Settings** → **Google**
3. Включите Google OAuth
4. Вставьте **Client ID** и **Client Secret** из Google Cloud
5. Сохраните изменения

#### Шаг 4: Consent Screen
В Google Cloud Console настройте Consent Screen:
- **App name**: Безмятежные
- **User support email**: ваш email
- **Developer contact**: ваш email
- **Authorized domains**: добавьте `lovable.app` и `supabase.co`
- **Scopes**: 
  - `.../auth/userinfo.email`
  - `.../auth/userinfo.profile`
  - `openid`

### 2. Telegram Login Widget (Опционально)

#### Шаг 1: Создание бота
1. Откройте [@BotFather](https://t.me/botfather) в Telegram
2. Отправьте `/newbot` и следуйте инструкциям
3. Получите API Token
4. Отправьте `/setdomain` и укажите домен приложения

#### Шаг 2: Добавление виджета
Добавьте в страницу Auth.tsx:
```tsx
// Добавить скрипт Telegram Widget
<script async src="https://telegram.org/js/telegram-widget.js?22" 
  data-telegram-login="ВАШ_БОТ" 
  data-size="large" 
  data-auth-url="https://bezmyatezhnye.lovable.app/auth/telegram"
  data-request-access="write">
</script>
```

#### Шаг 3: Edge Function для обработки
Создайте Edge Function `telegram-auth` для валидации и авторизации.

### 3. Email подтверждение (Production)

Для продакшена рекомендуется:
1. Открыть Lovable Cloud Dashboard
2. Перейти в **Users** → **Auth Settings**
3. **Включить** "Confirm email" для защиты от спама
4. Настроить SMTP для отправки emails (опционально)

### 4. Модерация контента

#### Проверка AI лимитов
1. Откройте Lovable Cloud Dashboard
2. Перейдите в **Settings** → **Usage**
3. Проверьте использование AI токенов
4. При необходимости пополните баланс

#### Мониторинг модерации
- Модерация сообщений: `/functions/moderate-message`
- Модерация постов: `/functions/moderate-story`
- Логи доступны в Edge Functions Logs

### 5. Донаты и Creator Chat (Будущее)

Для монетизации:
1. Интегрируйте платёжную систему (Stripe/ЮKassa)
2. Настройте таблицы `donations` и `creator_chat_bookings`
3. Добавьте Telegram Bot API для уведомлений о бронированиях

## 🚀 Развёртывание

### Preview (Автоматически)
Preview доступен автоматически:
```
https://bezmyatezhnye.lovable.app
```

### Production
1. Нажмите **Publish** в Lovable Editor
2. Выберите домен или подключите custom domain
3. Настройте DNS записи (если custom domain)

### Custom Domain
1. Перейдите в **Project** → **Settings** → **Domains**
2. Добавьте ваш домен
3. Настройте DNS:
   - Тип: CNAME
   - Имя: @ или www
   - Значение: предоставленный Lovable CNAME

## 📊 Мониторинг

### Analytics Dashboard
Доступно для администраторов:
```
/analytics
```

Показывает:
- Активных пользователей
- Количество постов/сообщений
- Использование AI токенов
- Графики роста

### Логи Edge Functions
1. Откройте Lovable Cloud Dashboard
2. Перейдите в **Edge Functions** → **Logs**
3. Фильтруйте по функции и времени

### Database Health
1. Откройте Lovable Cloud Dashboard
2. Перейдите в **Database**
3. Проверьте Table Editor и SQL Editor

## 🔒 Безопасность

### RLS Политики
Все таблицы имеют Row Level Security:
- Пользователи видят только свои данные
- Публичный контент доступен всем
- Админы имеют расширенный доступ

### Модерация AI
- Автоматическая модерация всех сообщений
- Флагирование высокорисковых постов
- Создание репортов для ручной проверки

### Приватность
- Анонимные посты поддерживаются
- Личные данные защищены RLS
- GDPR compliant

## 📞 Поддержка

### Ресурсы
- [Lovable Docs](https://docs.lovable.dev/)
- [Lovable Discord](https://discord.com/channels/1119885301872070706)
- [Supabase Docs](https://supabase.com/docs)

### Отладка
При проблемах проверьте:
1. Console logs (F12 → Console)
2. Network requests (F12 → Network)
3. Edge Function logs (Lovable Cloud Dashboard)
4. Database logs (Lovable Cloud Dashboard)

## ✨ Следующие шаги

### Контент
- [ ] Написать первые статьи в блог
- [ ] Создать первые события
- [ ] Запустить первые челленджи

### Маркетинг
- [ ] SEO оптимизация контента
- [ ] Social media интеграция
- [ ] Email рассылки

### Функции
- [ ] Push уведомления
- [ ] Видео-звонки между пользователями
- [ ] Мобильное приложение (PWA → Native)

---

**Проект готов к запуску!** 🎉

Для активации Google OAuth откройте:
