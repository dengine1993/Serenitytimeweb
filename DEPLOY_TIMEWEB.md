# Деплой на Timeweb Cloud Apps

Проект — статический Vite SPA. Деплоить **только** через **Timeweb Cloud Apps → вкладка Frontend → карточка React**.

> ⚠️ **НЕ использовать вкладки Docker и Backend.** Они запускают Nixpacks-фоллбэк с shell-скриптом, который падает на нашем `package.json` (см. Troubleshooting ниже).

## 1. Подготовка репозитория

В репозитории уже есть всё нужное:

- `package.json` с `"engines": { "node": ">=20.0.0" }` ✅
- `.nvmrc` со значением `20` ✅
- `.npmrc` с `legacy-peer-deps=true` ✅
- `public/_redirects` с правилом `/* /index.html 200` ✅
- `vite.config.ts` без кастомного `base` (по умолчанию `/`) ✅
- `package-lock.json` — единственный lock-файл (npm) ✅

## 2. Создание приложения в Timeweb

1. Личный кабинет → **Cloud Apps** → **Создать приложение**.
2. Вкладка **Frontend** → карточка **React** → нажать иконку **GitHub**.
3. Авторизовать Timeweb в GitHub, выбрать репозиторий и ветку `main`.

## 3. Параметры сборки

| Поле | Значение |
|---|---|
| Framework | **React** |
| Node.js | **20** (или 24) |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `dist` |
| SPA fallback | **Включить** (все 404 → `index.html`) |

## 4. Переменные окружения

В разделе **Environment** добавить **только клиентские** переменные (всё, что не `VITE_*`, на фронт не попадает):

```
VITE_SUPABASE_URL=<из текущего .env>
VITE_SUPABASE_ANON_KEY=<из текущего .env>
VITE_SUPABASE_PUBLISHABLE_KEY=<из текущего .env>
VITE_SUPABASE_PROJECT_ID=<из текущего .env>
```

⚠️ **Серверные секреты** (`SUPABASE_SERVICE_ROLE_KEY`, `POLZA_API_KEY`, `YANDEX_*`, `OPENROUTER_API_KEY`, `YOOKASSA_*`) **не добавлять** на фронт — они уже хранятся в Supabase Edge Functions Secrets.

## 5. Запуск деплоя

Нажмите **Deploy**. Timeweb выполнит `npm ci && npm run build`, опубликует содержимое `dist/` на CDN и выдаст домен вида `xxx.twc1.net`.

## 6. После первого деплоя

### Supabase

В Supabase Dashboard → **Authentication → URL Configuration**:

- **Site URL**: добавить новый прод-домен.
- **Redirect URLs**: добавить `https://<новый-домен>/**`.

### YooKassa

Если используется фильтр доменов в кабинете YooKassa — добавить новый домен в whitelist.

### hCaptcha

В дашборде hCaptcha добавить новый домен в список разрешённых.

### Свой домен

Cloud Apps → ваше приложение → **Domains** → добавить домен → прописать в DNS-провайдере CNAME на адрес от Timeweb. SSL-сертификат Let's Encrypt выпустится автоматически.

## 7. Проверка

- Открыть прод-домен → лендинг загружается.
- Перейти на `/auth`, обновить страницу (F5) → не должно быть 404 (работает SPA-fallback).
- Войти, проверить запрос к Supabase в DevTools → Network.

## Troubleshooting

### Сборка падает с `exit code 1` на шаге `RUN if [ -f yarn.lock ] ... npm ci --verbose`

Это значит, что приложение создано в режиме **Docker** или **Backend**, а не **Frontend → React**. В логе видно длинный shell-скрипт-фоллбэк — это Nixpacks Docker-образа Timeweb.

**Решение:**
1. Удалить текущее приложение в Timeweb.
2. Создать заново через вкладку **Frontend** → **React**.
3. В логе должен идти прямой `npm ci` без обвязки `if [ -f yarn.lock ]`.

### Сборка падает на `peer dependency` конфликтах

В репозитории уже лежит `.npmrc` с `legacy-peer-deps=true`. Если он по какой-то причине не подхватывается, в Timeweb можно вручную поменять Install command на:
```
npm ci --legacy-peer-deps
```

### В логе видно `bun install` или `pnpm install`

Это редкий кейс, если в репо одновременно лежат `package-lock.json` и другой lock-файл. Проверить, что в корне только `package-lock.json`. `bun.lock` Lovable создаёт автоматически, но npm-сборщик Timeweb должен его игнорировать благодаря наличию `package-lock.json` (npm имеет приоритет).

### Полный лог обрезан

Если в логе только `npm verbose code 1` без причины — раскрыть детали в Timeweb (кнопка «Показать полный лог» / скачать `_logs/...debug-0.log`) и прислать строки **до** `exit code 1`.

## Альтернатива: Docker (не рекомендуется)

В репо есть `Dockerfile` + `nginx.conf` для контейнерного хостинга. Использовать только если Frontend-режим недоступен — для статики это избыточно и дороже.

---

## Email через Timeweb «Почта для домена»

Все исходящие письма (уведомление админу об инциденте ПДн, напоминание об окончании подписки, подтверждение оплаты) идут **только** через Timeweb Cloud «Почта для домена» на ящик `noreply@newdawnjourney.com`. Никаких внешних email-сервисов (Unisender, Mailgun, Resend и т.п.) — это требование RU-data-residency. Свой VPS не нужен: SMTP, DKIM и PTR держит сам Timeweb.

### Шаги настройки в панели Timeweb (один раз)

1. **Личный кабинет Timeweb → Почта** → подключить услугу «Почта для домена» к домену `newdawnjourney.com` (есть бесплатный тариф, для нашего объёма достаточно).
2. В карточке домена нажать **«Применить рекомендованные DNS-записи»** — Timeweb автоматически пропишет в зону `newdawnjourney.com` нужные **MX**, **SPF** (`v=spf1 include:spf.timeweb.ru ~all`) и **DKIM**. Так как зона домена тоже у Timeweb, делается одной кнопкой.
3. Создать ящик `noreply@newdawnjourney.com`, задать пароль — он понадобится для секрета `SMTP_PASSWORD`.
4. (Рекомендуется) Добавить DMARC вручную в **DNS-записи домена**:
   - Имя: `_dmarc`
   - Тип: TXT
   - Значение: `v=DMARC1; p=none; rua=mailto:info@newdawnjourney.com`

PTR (reverse DNS) настраивать **не нужно** — он на стороне Timeweb.

### Секреты в Lovable Cloud

В разделе **Edge Functions → Secrets** должны быть заданы:

| Имя | Значение |
|---|---|
| `SMTP_HOST` | `smtp.timeweb.ru` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | `noreply@newdawnjourney.com` |
| `SMTP_PASSWORD` | пароль ящика, заданный в шаге 3 |

Отправитель в письмах: `Восход <noreply@newdawnjourney.com>` (зашит в `supabase/functions/_shared/smtp.ts`). Клиент (`denomailer`) автоматически использует SSL на 465.

### Проверка отправки

С любой машины (опционально):

```bash
swaks --to <ваш_личный_email> \
      --from noreply@newdawnjourney.com \
      --server smtp.timeweb.ru --port 465 --tls-on-connect \
      --auth LOGIN \
      --auth-user noreply@newdawnjourney.com \
      --auth-password '<пароль ящика>'
```

Письмо должно дойти и попасть **во входящие**, не в спам.

### End-to-end

После заполнения секретов — вызвать тестово edge-функцию `report-security-incident` от админа: в БД появится запись в `security_incidents`, в `pdn_audit_log` — `email_sent: true`, на `info@newdawnjourney.com` придёт письмо.

---

## Сборка Capacitor (Android / iOS)

Проект подготовлен под Capacitor: установлены пакеты `@capacitor/core`, `ios`, `android`, `app`, `status-bar`, `splash-screen`, `preferences`. Конфиг — в `capacitor.config.ts` (appId `com.newdawnjourney.app`, appName «Восход»).

В нативной обёртке Service Worker и Web Push отключены автоматически (см. `src/lib/platform.ts`, `PWAUpdatePrompt`, `useWebPush`, `WebPushPrompt`) — иначе WebView застрянет на первом билде.

### Локальный запуск (после `git pull`)

```bash
npm install
npx cap add ios          # один раз
npx cap add android      # один раз
npm run build
npx cap sync
npx cap run android      # или: npx cap open ios → запуск из Xcode
```

### Hot-reload из Lovable sandbox

В `capacitor.config.ts` блок `server.url` указывает на preview URL — это даёт live-reload на физическом устройстве. **Перед сборкой релизного APK / IPA для сторов закомментируй блок `server` целиком** и сделай `npm run build && npx cap sync`, чтобы WebView грузил локальный `dist/`.

### Deeplinks

- **Android App Links**: `public/.well-known/assetlinks.json` уже содержит `package_name` `com.newdawnjourney.app`. После генерации release-keystore замени `PLACEHOLDER` на SHA256-fingerprint:
  ```bash
  keytool -list -v -keystore release.keystore -alias <alias>
  ```
- **iOS Universal Links**: `public/.well-known/apple-app-site-association` содержит `TEAMID.com.newdawnjourney.app` — замени `TEAMID` на свой Apple Team ID. В Xcode → Signing & Capabilities → Associated Domains → `applinks:newdawnjourney.com`.

Файлы должны раздаваться с продакшен-домена `https://newdawnjourney.com/.well-known/...` (Timeweb отдаёт их как обычную статику из `public/`).

### Известные ограничения

- **Push-уведомления в нативке** не работают (Web Push не поддерживается в WebView). Для FCM/APNs нужен `@capacitor/push-notifications` — отдельная задача после релиза.
- **YooKassa return_url** для нативной версии лучше переключать на custom scheme `com.newdawnjourney.app://payment-success` через `Capacitor.isNativePlatform()` — текущая логика использует https-redirect (работает, но через внешний браузер).
