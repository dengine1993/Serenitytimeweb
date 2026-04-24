# Email Templates для Supabase

Готовые HTML шаблоны для настройки в **Supabase Dashboard → Authentication → Email Templates**.

---

## 1. Confirm Signup (Подтверждение регистрации)

**Subject:** Подтвердите ваш email — Безмятежные

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f0f4f8; margin: 0; padding: 24px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
    <!-- Header -->
    <tr>
      <td style="padding: 40px 32px 32px; text-align: center; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);">
        <img src="https://hvtpfbfawhmkvjtcyaxs.supabase.co/storage/v1/object/public/email-assets/logo-bezm.png" 
             alt="Безмятежные" 
             width="72" 
             height="72" 
             style="border-radius: 14px; border: 2px solid rgba(255,255,255,0.1);">
        <h1 style="color: #ffffff; margin: 20px 0 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">Безмятежные</h1>
        <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0; font-size: 14px;">Ваш путь к внутреннему спокойствию</p>
      </td>
    </tr>
    <!-- Content -->
    <tr>
      <td style="padding: 40px 32px;">
        <h2 style="color: #1a1a2e; margin: 0 0 16px; font-size: 22px; font-weight: 600;">Добро пожаловать! 🌿</h2>
        <p style="color: #4a5568; font-size: 16px; line-height: 1.7; margin: 0 0 28px;">
          Спасибо за регистрацию в приложении <strong>Безмятежные</strong>. Чтобы завершить создание аккаунта и получить доступ ко всем возможностям, подтвердите ваш email-адрес.
        </p>
        <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
          <tr>
            <td style="border-radius: 10px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);">
              <a href="{{ .ConfirmationURL }}" 
                 style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; letter-spacing: 0.3px;">
                Подтвердить email
              </a>
            </td>
          </tr>
        </table>
        <p style="color: #718096; font-size: 14px; margin-top: 32px; line-height: 1.6; text-align: center;">
          Или скопируйте ссылку:<br>
          <a href="{{ .ConfirmationURL }}" style="color: #667eea; word-break: break-all;">{{ .ConfirmationURL }}</a>
        </p>
      </td>
    </tr>
    <!-- Divider -->
    <tr>
      <td style="padding: 0 32px;">
        <div style="height: 1px; background: linear-gradient(90deg, transparent, #e2e8f0, transparent);"></div>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="padding: 28px 32px; text-align: center;">
        <p style="color: #a0aec0; font-size: 13px; margin: 0; line-height: 1.6;">
          Если вы не регистрировались на нашем сервисе,<br>просто проигнорируйте это письмо.
        </p>
        <p style="color: #718096; font-size: 14px; margin: 20px 0 0;">
          С заботой о вас,<br>
          <strong style="color: #4a5568;">Команда Безмятежные</strong>
        </p>
      </td>
    </tr>
  </table>
  <!-- Legal -->
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 16px auto 0;">
    <tr>
      <td style="text-align: center;">
        <p style="color: #a0aec0; font-size: 12px; margin: 0;">
          © 2024 Безмятежные. Все права защищены.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 2. Reset Password (Сброс пароля)

**Subject:** Сброс пароля — Безмятежные

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f0f4f8; margin: 0; padding: 24px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
    <!-- Header -->
    <tr>
      <td style="padding: 40px 32px 32px; text-align: center; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);">
        <img src="https://hvtpfbfawhmkvjtcyaxs.supabase.co/storage/v1/object/public/email-assets/logo-bezm.png" 
             alt="Безмятежные" 
             width="72" 
             height="72" 
             style="border-radius: 14px; border: 2px solid rgba(255,255,255,0.1);">
        <h1 style="color: #ffffff; margin: 20px 0 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">Безмятежные</h1>
        <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0; font-size: 14px;">Ваш путь к внутреннему спокойствию</p>
      </td>
    </tr>
    <!-- Content -->
    <tr>
      <td style="padding: 40px 32px;">
        <h2 style="color: #1a1a2e; margin: 0 0 16px; font-size: 22px; font-weight: 600;">Сброс пароля 🔐</h2>
        <p style="color: #4a5568; font-size: 16px; line-height: 1.7; margin: 0 0 28px;">
          Мы получили запрос на сброс пароля для вашего аккаунта. Нажмите кнопку ниже, чтобы создать новый пароль.
        </p>
        <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
          <tr>
            <td style="border-radius: 10px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);">
              <a href="{{ .ConfirmationURL }}" 
                 style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; letter-spacing: 0.3px;">
                Сбросить пароль
              </a>
            </td>
          </tr>
        </table>
        <p style="color: #718096; font-size: 14px; margin-top: 32px; line-height: 1.6; text-align: center;">
          Или скопируйте ссылку:<br>
          <a href="{{ .ConfirmationURL }}" style="color: #667eea; word-break: break-all;">{{ .ConfirmationURL }}</a>
        </p>
        <!-- Security Notice -->
        <div style="margin-top: 32px; padding: 16px 20px; background: #fff8e6; border-radius: 10px; border-left: 4px solid #f6ad55;">
          <p style="color: #744210; font-size: 14px; margin: 0; line-height: 1.6;">
            <strong>⚠️ Важно:</strong> Ссылка действительна 1 час. Если вы не запрашивали сброс пароля, проигнорируйте это письмо — ваш аккаунт в безопасности.
          </p>
        </div>
      </td>
    </tr>
    <!-- Divider -->
    <tr>
      <td style="padding: 0 32px;">
        <div style="height: 1px; background: linear-gradient(90deg, transparent, #e2e8f0, transparent);"></div>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="padding: 28px 32px; text-align: center;">
        <p style="color: #718096; font-size: 14px; margin: 0;">
          С заботой о вас,<br>
          <strong style="color: #4a5568;">Команда Безмятежные</strong>
        </p>
      </td>
    </tr>
  </table>
  <!-- Legal -->
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 16px auto 0;">
    <tr>
      <td style="text-align: center;">
        <p style="color: #a0aec0; font-size: 12px; margin: 0;">
          © 2024 Безмятежные. Все права защищены.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## Как применить шаблоны

1. Откройте [Supabase Dashboard → Authentication → Email Templates](https://supabase.com/dashboard/project/hvtpfbfawhmkvjtcyaxs/auth/templates)

2. Для каждого типа письма:
   - Выберите шаблон (Confirm signup / Reset Password)
   - Вставьте **Subject** в поле темы
   - Вставьте **HTML** в редактор (переключитесь на Source/HTML режим)
   - Нажмите **Save**

3. **Не забудьте загрузить логотип:**
   - [Storage → email-assets](https://supabase.com/dashboard/project/hvtpfbfawhmkvjtcyaxs/storage/buckets/email-assets)
   - Upload `logo-bezm.png`

---

## Переменные Supabase

| Переменная | Описание |
|------------|----------|
| `{{ .ConfirmationURL }}` | Полная ссылка подтверждения/сброса |
| `{{ .Token }}` | OTP код (для magic link) |
| `{{ .TokenHash }}` | Хэш токена |
| `{{ .SiteURL }}` | URL сайта |
| `{{ .Email }}` | Email пользователя |

---

## Превью

### Confirm Signup
```
┌──────────────────────────────────────────┐
│  ┌────────────────────────────────────┐  │
│  │     [ЛОГОТИП]                      │  │
│  │     Безмятежные                    │  │
│  │     Ваш путь к спокойствию         │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Добро пожаловать! 🌿                    │
│                                          │
│  Спасибо за регистрацию...               │
│                                          │
│      ┌────────────────────┐              │
│      │ Подтвердить email  │              │
│      └────────────────────┘              │
│                                          │
│  ─────────────────────────────────────   │
│  С заботой, Команда Безмятежные          │
└──────────────────────────────────────────┘
```

### Reset Password
```
┌──────────────────────────────────────────┐
│  ┌────────────────────────────────────┐  │
│  │     [ЛОГОТИП]                      │  │
│  │     Безмятежные                    │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Сброс пароля 🔐                         │
│                                          │
│  Мы получили запрос на сброс...          │
│                                          │
│      ┌────────────────────┐              │
│      │  Сбросить пароль   │              │
│      └────────────────────┘              │
│                                          │
│  ⚠️ Ссылка действительна 1 час           │
│                                          │
│  ─────────────────────────────────────   │
│  С заботой, Команда Безмятежные          │
└──────────────────────────────────────────┘
```
