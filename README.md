# Безмятежные (Bezmyatezhnye)

PWA- платформа эмоциональной поддержки для людей с тревожными и паническими состояниями.

**Lovable Project**: https://lovable.dev/projects/b86ef821-f83d-4118-a75d-03b049e515a8

---

## Технологии

### Frontend
- **React 18** + **TypeScript**
- **Vite** — сборка
- **Tailwind CSS** + **shadcn/ui** — дизайн-система
- **Framer Motion** — анимации

### Backend (Lovable Cloud)
- **Supabase** — база данных (PostgreSQL + pgvector)
- **Edge Functions** (Deno) — серверная логика
- **Lovable AI** — LLM интеграция (google/gemini-2.5-flash)

### Integrations
- **YooKassa** — платежи (RUB)
- **Telegram** — авторизация

---

## Основные функции

### 1. Кризисная поддержка 🆘
Быстрый доступ к техникам дыхания, заземления и службам помощи.

### 2. Навигатор
Пошаговый гид через панику и тревогу с техниками самопомощи.

### 3. Лента сообщества
Публичная лента эмоциональных историй с реакциями и поддержкой.

### 4. AI-Психотерапевт ✨ (Premium)
Текстовый помощник с подходом профессионального психотерапевта.
- 💬 **Chat Support** — ответы на вопросы о тревоге
- 🧠 **AI-powered** — Lovable AI

### 5. Арт-терапия 🎨 (Premium)
Рисование эмоций с AI-анализом рисунков.

### 6. Дневник настроений
Трекинг эмоционального состояния с визуализацией динамики.

---

## Установка и запуск

### Требования
- Node.js 18+
- npm или yarn

### Локальная разработка

```bash
# Клонирование репозитория
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Установка зависимостей
npm install

# Запуск dev сервера
npm run dev

# Сборка production
npm run build

# Preview production build
npm run preview
```

### Environment Variables

Все environment variables автоматически предоставлены через **Lovable Cloud**.

---

## Архитектура

### Database Schema

Основные таблицы:
- `profiles` — пользователи
- `posts` — посты в ленте
- `emotion_calendar` — эмоциональный трекинг
- `subscriptions` — подписки (Free/Premium)
- `researcher_usage_daily` — лимиты AI-психотерапевта
- `user_art_therapy_entries` — сохранённые рисунки

### Edge Functions

**Core Functions**:
- `researcher-chat` — AI-психотерапевт (streaming)
- `analyze-drawing` — анализ рисунков
- `create-payment` — создание платежа (YooKassa)
- `yookassa-webhook-v2` — обработка webhook от YooKassa
- `moderate-message` — модерация сообщений

### Frontend Structure

```
src/
├── components/       # Переиспользуемые компоненты
│   ├── ui/          # shadcn/ui компоненты
│   ├── feed/        # Компоненты ленты
│   ├── effects/     # Визуальные эффекты
│   ├── paywall/     # Premium paywall
│   └── billing/     # Платежные компоненты
├── features/        # Feature-специфичные модули
│   ├── art-therapy/ # Арт-терапия
│   └── onboarding/  # Онбординг
├── pages/           # Страницы (React Router)
├── hooks/           # Custom React hooks
├── lib/             # Утилиты и хелперы
├── i18n/            # Переводы (ru/en)
└── config/          # Конфигурация
```

---

## Scripts

### Development
```bash
npm run dev              # Запуск dev сервера
npm run build            # Production build
npm run preview          # Preview production build
npm run lint             # ESLint проверка
```

---

## Deployment

Проект развёрнут через **Lovable Cloud** с автоматической сборкой и деплоем Edge Functions.

**Production URL**: https://bezmyatezhnye.lovable.app

### Как задеплоить изменения?

1. **Через Lovable** (рекомендуется):
   - Открыть [Lovable Project](https://lovable.dev/projects/b86ef821-f83d-4118-a75d-03b049e515a8)
   - Кликнуть **Share → Publish**

2. **Через Git**:
   - Push изменения в main ветку
   - Lovable автоматически задеплоит

---

## Мониторинг

### Логи
- **Supabase Dashboard** → Logs → Edge Functions

### Поддержка
- Email: support@bezmetezhnye.app
- Telegram: @bezmetezhnye_support

---

## Contributing

Проект в активной разработке. Для контрибуции:

1. Fork репозитория
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Commit изменений (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

---

## Лицензия

Proprietary — все права защищены.

---

## Команда

Разработано с ❤️ командой **Безмятежные**

Powered by [Lovable](https://lovable.dev)

---

**Last Updated**: 2025-12-22  
**Version**: 2.0