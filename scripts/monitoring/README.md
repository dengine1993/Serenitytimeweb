# Supabase Log Monitoring

Эта папка содержит простой скрипт на Deno, который умеет опрашивать Supabase Logs API и отправлять уведомления о критичных ошибках в любой вебхук (Slack, Teams, собственный HTTP‑endpoint). Решение специально сделано максимально простым, чтобы человек без технического бэкграунда мог его запустить.

## Что понадобится

1. **Supabase Access Token** – создаётся в [Supabase -> Account -> Access Tokens](https://supabase.com/dashboard/account/tokens). Достаточно read‑only прав.
2. **Project Ref** – идентификатор проекта (вида `abcd1234`). Его можно увидеть в URL Supabase Dashboard.
3. **Webhook** – любой URL, который принимает POST (например, Slack Incoming Webhook).

## Переменные окружения

| Название | Описание |
|----------|----------|
| `SUPABASE_ACCESS_TOKEN` | Access Token из Supabase |
| `SUPABASE_PROJECT_REF` | Project Ref |
| `ALERT_WEBHOOK_URL` | Куда отправлять уведомления |
| `MONITORED_FUNCTIONS` | Список функций через запятую (`llm-chat,create-payment,jiva-embeddings-ingest`) |
| `LOOKBACK_MINUTES` | За какой период брать логи (по умолчанию 5 минут) |

## Как запустить

```bash
SUPABASE_ACCESS_TOKEN=... \
SUPABASE_PROJECT_REF=abcd1234 \
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/... \
MONITORED_FUNCTIONS="llm-chat,create-payment,jiva-embeddings-ingest" \
deno run --allow-env --allow-net scripts/monitoring/poll-logs.ts
```

Скрипт один раз опросит Supabase Logs API и, если найдёт ошибки в указанных функциях, отправит уведомление в вебхук. Чтобы мониторинг работал постоянно, можно:

- Запустить задачу cron (например, раз в 5 минут).
- Или оставить процесс работать в tmux/screen.

## Что делает скрипт

1. Формирует запрос к `https://api.supabase.com/v1/projects/{projectRef}/logs` для каждого указанных функций.
2. Фильтрует только ERROR‑уровень.
3. Если находит записи, отправляет короткое сообщение в вебхук с названием функции и кусочком лога.

## Почему это безопасно

- Используются только публичные API Supabase.
- Access Token хранится снаружи и не попадёт в репозиторий.
- Отключить мониторинг можно просто остановив cron/процесс.

## Что делать при срабатывании

1. Посмотреть сообщение в Slack (или другом канале) — в нём будет название функции и текст ошибки.
2. Зайти в Supabase Dashboard → Logs → Edge Functions, чтобы увидеть полный лог.
3. После исправления снова запустить cron/скрипт (если его останавливали).

