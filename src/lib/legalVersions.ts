// Legal document versions for consent tracking
// Updated: 2026-05-02-ru-esign — приведение к 152-ФЗ + 63-ФЗ:
// 1) Privacy п. 3 явно квалифицирует пользовательский контент как спец. категорию
//    ПДн (ст. 10 152-ФЗ); устранено внутреннее противоречие со «страховочным»
//    согласием.
// 2) Privacy + Offer добавлен раздел «Электронная подпись» (63-ФЗ ст. 5–6):
//    email + пароль + подтверждение email = простая ЭП, равнозначная
//    собственноручной; галочка чекбокса в этой сессии = письменное согласие в
//    электронной форме (ч. 4 ст. 9, п. 1 ч. 2 ст. 10 152-ФЗ).
// Предыдущие ревизии:
// 2026-05-02-ru-name-to-jiva — opt-in передача имени Дживе.
// 2026-05-02-ru-152fz — приведение к 152-ФЗ для оператора спец. категорий ПДн.
export const LEGAL_VERSIONS = {
  offer: '2026-05-02-ru-esign',
  privacy: '2026-05-02-ru-esign',
  refund: '2026-05-02-ru-152fz',
  disclaimer: '2026-05-02-ru-152fz',
  consent: '2026-05-02-ru-esign',
  cookies: '2026-05-02-ru-152fz',
} as const;

export type ConsentType =
  | 'offer'
  | 'privacy'
  | 'immediate_service'
  | 'disclaimer'
  | 'consent'
  | 'cookies'
  | 'special_category'
  | 'age_16plus'
  | 'name_to_jiva';
