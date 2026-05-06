import type { ReactNode } from "react";

interface Props {
  renderLink?: (target: 'offer' | 'disclaimer' | 'privacy' | 'refund' | 'seller' | 'consent' | 'cookies', label: string) => ReactNode;
}

export const CookiesMeta = {
  title: "Политика использования файлов cookie",
  lastUpdated: "Редакция от 2 мая 2026 г.",
  description: "Политика использования файлов cookie приложения Восход.",
};

export function CookiesContent({ renderLink }: Props) {
  const link = (target: 'offer' | 'disclaimer' | 'privacy' | 'refund' | 'seller' | 'consent' | 'cookies', label: string) =>
    renderLink ? renderLink(target, label) : <span className="text-primary underline">{label}</span>;

  return (
    <>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">1. Что такое cookies</h2>
        <p>
          Cookies — это небольшие текстовые файлы, которые сайт сохраняет в браузере Пользователя для обеспечения работы Сервиса, запоминания настроек и сбора аналитических данных. Использование cookies регулируется Федеральным законом № 152-ФЗ «О персональных данных» и методическими рекомендациями Роскомнадзора.
        </p>
      </section>

      <section className="space-y-4 mt-8">
        <h2 className="text-xl font-semibold">2. Категории cookies, используемых Сервисом</h2>

        <h3 className="text-lg font-semibold mt-4">2.1. Строго необходимые (technical)</h3>
        <p>
          Используются для работы базовой функциональности: аутентификация, сохранение сессии, безопасность. Без этих cookies Сервис не может функционировать. Согласия не требуют (правовое основание — п. 5 ч. 1 ст. 6 152-ФЗ, исполнение договора).
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li><code>sb-access-token</code>, <code>sb-refresh-token</code> — токены сессии системы аутентификации Сервиса (российская инфраструктура, серверы на территории РФ; срок: 7 дней)</li>
          <li><code>onboarding_completed</code> — статус прохождения онбординга (локально)</li>
        </ul>

        <h3 className="text-lg font-semibold mt-4">2.2. Функциональные</h3>
        <p>
          Запоминают предпочтения пользователя (тема, язык, региональные настройки). Срок — до 1 года.
        </p>

        <h3 className="text-lg font-semibold mt-4">2.3. Аналитические</h3>
        <p>
          Собирают обезличенную информацию о том, как Пользователи взаимодействуют с Сервисом (страницы, время на странице, тип устройства), для улучшения качества. Используются только при наличии согласия Пользователя. Срок — до 13 месяцев.
        </p>
      </section>

      <section className="space-y-4 mt-8">
        <h2 className="text-xl font-semibold">3. Управление cookies</h2>
        <p>
          При первом посещении Сервиса Пользователю предлагается принять или отклонить необязательные cookies (функциональные и аналитические). Решение можно изменить в любой момент в разделе «Настройки → Конфиденциальность → Cookie».
        </p>
        <p>
          Дополнительно Пользователь может управлять cookies в настройках своего браузера: блокировать, удалять или ограничивать их использование. Отключение строго необходимых cookies приведёт к невозможности работы Сервиса.
        </p>
      </section>

      <section className="space-y-4 mt-8">
        <h2 className="text-xl font-semibold">4. Передача данных cookies третьим лицам</h2>
        <p>
          Данные строго необходимых и функциональных cookies хранятся и обрабатываются на серверах Сервиса, расположенных на территории Российской Федерации, и третьим лицам не передаются. Аналитические cookies могут передаваться поставщикам сервисов аналитики в обезличенном виде. Полный перечень получателей указан в {link('privacy', 'Политике обработки персональных данных')}.
        </p>
      </section>

      <section className="space-y-4 mt-8">
        <h2 className="text-xl font-semibold">5. Изменение Политики cookie</h2>
        <p>
          Оператор вправе вносить изменения в настоящую Политику. Актуальная версия всегда размещена по адресу <code>/cookies</code>.
        </p>
        <p>
          Контакт по вопросам обработки персональных данных: <a href="mailto:info@newdawnjourney.com" className="text-primary underline">info@newdawnjourney.com</a>.
        </p>
      </section>
    </>
  );
}
