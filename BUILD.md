# Сборка «Восход» — два таргета из одного репозитория

В проекте две независимые цели сборки. Источник кода один (`src/`), различия
определяются режимом Vite (`--mode`).

| Таргет    | Команда                  | PWA / SW | Куда идёт                          |
|-----------|--------------------------|----------|-------------------------------------|
| Web       | `npm run build`          | вкл.     | Timeweb Frontend (`newdawnjourney.com`) |
| Capacitor | `npm run build:capacitor`| выкл.    | iOS / Android через `npx cap sync`  |

Что разводит сборки:
- `vite.config.ts` — `VitePWA` подключается только при `mode !== "capacitor"`.
- `src/components/pwa/PWAUpdatePrompt.tsx` — динамически грузит web-вариант
  только если `import.meta.env.MODE !== 'capacitor'`. В нативной сборке
  виртуальный модуль `virtual:pwa-register/react` не запрашивается.
- Runtime-проверки `Capacitor.isNativePlatform()` в push/sentry/storage
  работают и так, и так.

## Web-деплой (Timeweb Frontend)

Локально:
```bash
npm ci
npm run build
# результат в dist/  — содержит sw.js, workbox, manifest, splash
```

В панели Timeweb (Frontend → React/Vite):
- **Build command**: `npm ci && npm run build`
- **Output dir**: `dist`
- **Node**: `20`
- **SPA fallback**: уже покрыт `public/_redirects` (`/*  /index.html  200`).

## Capacitor-сборка (iOS / Android)

Один раз после `git clone` (или после `npm ci`):
```bash
npx cap add ios       # на Mac с Xcode
npx cap add android   # на машине с Android Studio
```

Каждый релиз:
```bash
npm ci
npm run build:capacitor   # PWA выключен, SW не регистрируется
npx cap sync              # копирует dist/ в ios/ и android/
npx cap open ios          # либо: npx cap open android
```

Дальше — обычный workflow Xcode / Android Studio (подпись, архив, загрузка
в App Store Connect / Google Play Console).

### Hot-reload на физическом устройстве (опционально)

В `capacitor.config.ts` раскомментировать блок `server` и подставить свой
preview URL. **Не коммитить** раскомментированный `server` — это блокер
для релиза в сторы.

## Чего не делать

- Не возвращать `vite-plugin-pwa` в Capacitor-сборку.
- Не удалять `public/_redirects` — без него Timeweb отдаст 404 при F5
  на любой не-корневой роуте.
- Не выставлять `server.url` в `capacitor.config.ts` для релизных билдов
  — иначе нативка будет грузить контент с хоста, а не из локального `dist/`.
