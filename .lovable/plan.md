## Push-уведомления: минимальный набор + админ-рассылка

Цель — не превратить «Восход» в источник шума. Push должен звать обратно только тогда, когда это действительно ценно для пользователя, и должен работать одинаково на Web (VAPID) и в нативке (FCM/APNs через Capacitor). Инфра уже частично есть: таблицы `device_push_tokens`, `push_subscriptions`, `notifications`, `notification_preferences`, edge `send-web-push`, хук `usePushNotifications`.

### 1. UX-дизайн: какие пуши вообще шлём

Принцип: **один пуш = одно личное событие, которое юзер ждёт от другого человека или от себя**. Никаких маркетинговых, «вернись», «открой приложение».

Оставляем ровно 5 типов (всё остальное — только в шторке `notifications`, без push):

| Тип | Когда шлём | Текст (пример) | Дип-линк |
|---|---|---|---|
| `dm` | Новое личное сообщение в приватном чате | «Аня: Привет, как ты?» | `/private/{conversationId}` |
| `mention` | @упоминание в общем чате или в комментарии | «Аня упомянула тебя в чате» | `/community` или `/post/{id}` |
| `reply_to_post` | Кто-то ответил в комментариях к **твоему** посту-Восходу | «Аня поддержала твой Восход» | `/post/{id}` |
| `friend_request` | Входящий запрос в друзья | «Аня хочет добавить тебя в друзья» | `/friends` |
| `admin_broadcast` | Ручная рассылка из админки | произвольный | произвольный (по умолчанию `/app`) |

Сознательно **не шлём push** для: реакций-сердечек (агрегируем в badge), Jiva-комментариев в фиде (это не личное событие), системных «спасибо за регистрацию», новых постов в ленте, ежедневных напоминаний дневника (это будет отдельный продукт позже, не в этой итерации).

### 2. UX-правила доставки

- **Тихие часы:** уважаем `notification_preferences.quiet_hours_*`. В тихие часы пуш не отправляется (кроме `admin_broadcast` с флагом `urgent=true`).
- **Агрегация DM:** не более 1 пуша в 60 секунд от одного отправителя одному получателю — последующие апдейтят тот же пуш (`tag = dm:{senderId}`).
- **Per-type opt-out:** добавляем недостающие колонки в `notification_preferences` (`push_dm`, `push_admin`). Все по умолчанию `true`, кроме `push_admin` — `true`, но в Settings даём явный тумблер.
- **Не шлём себе:** отправитель никогда не получает push о собственном действии.
- **Срок жизни:** TTL = 24ч. Просроченная подписка (410/404) — удаляем из `push_subscriptions` / `device_push_tokens`.
- **Запрос разрешения:** Web — текущий `WebPushPrompt` через 10 сек после логина (не трогаем). Native — текущий `usePushNotifications` (не трогаем).

### 3. Что нужно сделать в коде

**3.1. Миграция БД**
- `notification_preferences`: добавить `push_dm boolean default true`, `push_admin boolean default true`.
- Новая таблица `admin_broadcasts` (для аудита и повторов):
  - `id`, `created_by uuid`, `title text`, `body text`, `url text`, `audience text` (`all|premium|free|user_ids`), `audience_user_ids uuid[]`, `urgent boolean`, `sent_count int`, `failed_count int`, `created_at`.
  - RLS: SELECT/INSERT только для `is_admin()`.

**3.2. Единый отправитель — новая edge-функция `push-dispatch`**
- Вход: `{ user_ids: uuid[], type: 'dm'|'mention'|'reply_to_post'|'friend_request'|'admin_broadcast', title, body, url?, tag?, urgent?: boolean, data? }`.
- Логика на сервере:
  1. Подгружает `notification_preferences` по user_ids → фильтрует по типу и тихим часам.
  2. Для каждого юзера достаёт **и** web-подписки (`push_subscriptions`) **и** native-токены (`device_push_tokens`).
  3. Web — шлёт через `web-push` (текущая реализация `send-web-push` встраивается сюда же, старую функцию удаляем).
  4. Native (FCM/APNs) — шлёт через FCM HTTP v1 (для Android) и APNs HTTP/2 (для iOS).
  5. Чистит протухшие endpoints (404/410, NotRegistered, InvalidRegistration).
  6. Возвращает `{sent, failed, skipped}`.
- Вызывается с сервера: триггерами edge-функций (DM, mention, reply, friend_request) и из админки.
- `verify_jwt = false` + проверка либо JWT юзера, либо `INTERNAL_FUNCTION_SECRET` для server-to-server.

**3.3. Триггеры доставки (минимум)**
- `private-message-send`: вызывает `push-dispatch` (`type=dm`, recipient).
- `notify-mention` (уже есть): после записи notification — добавляем вызов `push-dispatch`.
- Комментарий к посту (новая edge `notify-post-reply` или прямо в `auto-comment-post` обработчике): шлёт владельцу поста, если автор комментария ≠ владелец и комментарий не от Jiva.
- `friend_request`: в edge, обрабатывающей friend requests, добавить вызов.

**3.4. Секреты для FCM/APNs (нативка)**
Нужны новые runtime-секреты — попрошу добавить отдельным сообщением, **не сейчас**:
- `FCM_SERVICE_ACCOUNT_JSON` (Firebase service account JSON — для Android и iOS через FCM, проще всего)
- Альтернатива: `APNS_KEY_P8`, `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID` если хотим APNs напрямую.

Рекомендую **FCM как единый канал** (Android нативно + iOS через FCM-обёртку) — один секрет, одна логика. Это требует регистрации iOS-приложения в Firebase и заливки APNs ключа в Firebase Console (одноразово, делает пользователь).

**3.5. Админка — страница `/admin/notifications`**
Новый пункт в `MoreDrawer` админ-секции и роут `src/pages/admin/Notifications.tsx`:
- Форма: Заголовок (≤50 симв), Текст (≤180 симв), URL (опц.), Аудитория (радио: Все / Premium / Free / По списку email), Срочный (чекбокс — игнорирует тихие часы), Превью (как пуш будет выглядеть на iOS/Android).
- Кнопки «Тестовая отправка себе» и «Разослать».
- Под формой — таблица последних 20 рассылок из `admin_broadcasts` с `sent/failed/created_at/created_by`.
- Edge-функция `admin-broadcast-push`:
  - Проверяет `is_admin()`.
  - Резолвит аудиторию → массив user_ids (через email-список → profile lookup).
  - Пишет запись в `admin_broadcasts`.
  - Чанкует по 500 user_ids и зовёт `push-dispatch` с `type=admin_broadcast`.
  - Обновляет `sent_count/failed_count`.

**3.6. Чистка**
- Удалить старый `send-web-push` после миграции триггеров на `push-dispatch`.
- Добавить в `notification_preferences` UI в Settings тумблеры для всех 5 типов + DM + admin (сейчас есть не все).

### 4. Файлы

```text
Создать:
  supabase/migrations/<ts>_push_v2.sql
  supabase/functions/push-dispatch/index.ts
  supabase/functions/admin-broadcast-push/index.ts
  src/pages/admin/Notifications.tsx
  src/components/admin/BroadcastPreview.tsx
Изменить:
  supabase/functions/notify-mention/index.ts  (+ вызов push-dispatch)
  supabase/functions/auto-comment-post/index.ts  (+ reply-to-post push)
  src/App.tsx  (+ роут /admin/notifications)
  src/components/navigation/MoreDrawer.tsx или admin-меню (+ ссылка)
  src/components/settings/* (тумблеры push_dm / push_admin)
Удалить (после миграции):
  supabase/functions/send-web-push  (логика переезжает в push-dispatch)
```

### 5. Что подтвердить перед стартом

1. Использовать **FCM как единый канал** для Android + iOS (нужен один секрет `FCM_SERVICE_ACCOUNT_JSON`, и от тебя — настройка Firebase-проекта + загрузка APNs ключа в Firebase Console)? Или хочешь APNs напрямую (4 секрета, чуть сложнее)?
2. Согласен на список из 5 типов выше? Если хочешь добавить «реакция на твой пост» отдельным push — скажи (по умолчанию я их агрегирую в badge без push).
3. Аудитории админ-рассылки — нужны ли ещё сегменты помимо `all / premium / free / список email`?

После подтверждения — переключаемся в build-режим и я делаю миграцию + 2 edge-функции + админ-страницу одной итерацией.
