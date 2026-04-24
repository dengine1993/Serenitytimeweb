

## План: починить сборку на Timeweb

### Диагноз

Лог `RUN if [ -f yarn.lock ]; then ... elif [ -f package-lock.json ]; then npm ci --verbose ...` — это **Nixpacks/Docker** билдер Timeweb, а не Frontend-режим. При Frontend → React такого шага нет, там идёт прямой `npm ci`. Возможные причины падения `npm ci`:

1. **Выбран не тот режим** в Timeweb (Backend/Docker вместо Frontend → React). Скрипт-фоллбэк в Docker-образе валится на нашем монорепо-подобном `package.json` (есть `tsx`, `deno`-скрипты, два lock-файла — `package-lock.json` и `bun.lock`).
2. **`bun.lock` рядом с `package-lock.json`** может сбивать определение пакет-менеджера и запускать частичный `bun install` либо ломать кэш.
3. Полный текст npm-ошибки обрезан (виден только `code 1` и ссылка на `_logs/...debug-0.log`) — точная причина в нём, но мы её не видим.

### Решение (по приоритету)

**Шаг 1 — переключить Timeweb на правильный режим.**
В кабинете Timeweb Cloud Apps:
- Удалить текущее приложение (или создать рядом новое).
- Создать заново: вкладка **Frontend** → карточка **React** (НЕ Docker, НЕ Backend).
- Параметры: Install `npm ci`, Build `npm run build`, Output `dist`, SPA fallback ON.

Это уберёт shell-скрипт-фоллбэк из лога и даст чистую ошибку, если она останется.

**Шаг 2 — убрать `bun.lock` из репозитория.**
Файл создан Lovable «на всякий случай», но проект использует npm (`package-lock.json`). Два lock-файла = непредсказуемый билдер. Удалю `bun.lock`, чтобы любой хостинг (Timeweb, Vercel, Netlify) однозначно видел npm.

**Шаг 3 — добавить `.npmrc` с `legacy-peer-deps=true`.**
В `package.json` лежат пакеты с конфликтующими peer-зависимостями (React 18 + некоторые Radix/three.js библиотеки). Локально это не падает, потому что lock-файл уже разрешён, но `npm ci --verbose` в Docker-фоллбэке Timeweb может падать именно на peer-конфликтах. `.npmrc` с `legacy-peer-deps=true` решает проблему универсально.

**Шаг 4 — обновить `DEPLOY_TIMEWEB.md`.**
Жирно подчеркнуть: «**Только Frontend → React**, не Docker, не Backend» + добавить раздел «Если сборка падает с `exit code 1` на `npm ci`».

**Шаг 5 (опционально, если Шаг 1 невозможен) — поправить `Dockerfile`.**
У нас в репо есть собственный `Dockerfile`. Если Timeweb всё-таки идёт через Docker-вкладку, он должен использовать НАШ Dockerfile, а не Nixpacks-фоллбэк. Проверю, что в Timeweb Docker-вкладке указан путь к нашему `Dockerfile`, и что он сам корректно делает `npm ci && npm run build`.

### Файлы под правку

- **Удалить**: `bun.lock`
- **Создать**: `.npmrc` с содержимым:
  ```
  legacy-peer-deps=true
  fund=false
  audit=false
  ```
- **Обновить**: `DEPLOY_TIMEWEB.md` — выделить выбор режима, добавить troubleshooting-секцию.
- **Не трогаем**: `package.json`, `package-lock.json`, `Dockerfile`, `nginx.conf`, `nixpacks.toml`.

### Что делаешь ты после моих правок

1. В Timeweb Cloud Apps — удалить старое приложение, создать новое через **Frontend → React** (не Docker!).
2. Указать репозиторий, ветку `main`, переменные `VITE_SUPABASE_*`.
3. Запустить Deploy.
4. Если опять падает — пришли мне **полный** лог (особенно строки до `exit code 1`, а не только `npm notice`).

