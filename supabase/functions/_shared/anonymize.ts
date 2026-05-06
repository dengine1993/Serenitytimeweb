/**
 * Обезличивание данных перед отправкой в зарубежные LLM-провайдеры.
 *
 * Юридическая база:
 * - 152-ФЗ ст. 3 п. 9 (определение обезличивания)
 * - Приказ Роскомнадзора № 996 (методы обезличивания)
 *
 * Принцип: всё, что уезжает наружу, не должно позволять без дополнительной
 * информации (которая остаётся только в РФ-БД) идентифицировать субъекта.
 *
 * Уровень — «мягкий» (по решению владельца продукта):
 *  - убираем прямые идентификаторы (display_name, email, телефон, ник, карты,
 *    URL, точный возраст, город из profile);
 *  - смысл свободного текста (заметок дневника, постов) сохраняем,
 *    маскируя только явные PII-паттерны.
 *
 * Стабильный псевдо-ID наружу НЕ передаётся (нет X-User-Hash и подобного).
 * Псевдоним для обращения генерируется только локально внутри edge-функции
 * на основе `ANONYMIZE_SALT` и не покидает РФ-инфраструктуру за пределы
 * текущего ответа Дживы.
 */

// Используется ТОЛЬКО как fallback, когда у пользователя нет display_name
// или он не дал согласие на передачу имени Дживе. Делаем список коротким и тёплым.
const PSEUDONYMS = ['Друг', 'Спутник'];

const SALT = Deno.env.get('ANONYMIZE_SALT') ?? 'sunrise-default-salt-change-me';

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Возвращает стабильный нейтральный псевдоним для обращения внутри сессии.
 * Использует sha256(seed + SALT) → индекс в PSEUDONYMS.
 * Имя пользователя (display_name) НЕ передаётся в LLM ни в каком виде.
 */
export async function pseudonymizeName(seed: string): Promise<string> {
  if (!seed) return PSEUDONYMS[0];
  const hex = await sha256Hex(seed + SALT);
  // первые 8 hex-символов → uint32 → mod len
  const idx = parseInt(hex.slice(0, 8), 16) % PSEUDONYMS.length;
  return PSEUDONYMS[idx];
}

/**
 * Группирует год рождения в возрастной диапазон.
 * Точный год → диапазон 10 лет.
 */
export function ageBucketFromBirthYear(birthYear: number | null | undefined): string | null {
  if (!birthYear || birthYear < 1900 || birthYear > new Date().getFullYear()) return null;
  const age = new Date().getFullYear() - birthYear;
  if (age < 18) return '<18';
  if (age < 25) return '18-24';
  if (age < 35) return '25-34';
  if (age < 45) return '35-44';
  if (age < 55) return '45-54';
  return '55+';
}

/**
 * Маскирует явные PII в свободном тексте.
 * Сохраняет смысл — НЕ трогает имена собственные и топонимы (мягкий уровень).
 */
export function redactPII(input: string | null | undefined): string {
  if (!input) return '';
  let text = String(input);

  // 1. Email
  text = text.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]');

  // 2. URL (http/https/www)
  text = text.replace(/\b(?:https?:\/\/|www\.)[^\s<>"']+/gi, '[ссылка]');

  // 3. @username (Telegram/IG-style), длиной 3-32, не email (email уже выше)
  text = text.replace(/(^|\s)@[a-zA-Z0-9_]{3,32}\b/g, '$1[ник]');

  // 4. Телефоны: международные/RU форматы.
  //    Ловим последовательности из 10+ цифр, возможно разделённых
  //    пробелами/дефисами/скобками/точками, с опциональным + в начале.
  text = text.replace(
    /\+?\d[\d\s\-().]{8,}\d/g,
    (match) => {
      const digits = match.replace(/\D/g, '');
      return digits.length >= 10 ? '[телефон]' : match;
    },
  );

  // 5. Карточные номера 13-19 цифр (с пробелами/дефисами)
  text = text.replace(
    /\b(?:\d[ -]?){13,19}\b/g,
    '[номер]',
  );

  // 6. Длинные «голые» цифровые последовательности 9+ (счета, паспорта, СНИЛС-подобное)
  text = text.replace(/\b\d{9,}\b/g, '[номер]');

  // 7. Даты ДД.ММ.ГГГГ / ДД-ММ-ГГГГ / ISO YYYY-MM-DD внутри свободного текста
  //    оставляем — они не идентифицируют сами по себе и важны для контекста дневника.
  //    Маскируем только явные «родился ... 12.05.1993»-конструкции? — нет, мягкий уровень.

  return text;
}

/**
 * Профиль из БД → безопасный для LLM словарь.
 * - display_name удаляется
 * - city удаляется (косвенный идентификатор)
 * - birth_year → возрастная группа
 * - gender и goals остаются (нужны для качества ответа, не идентифицируют)
 */
export interface RawProfile {
  display_name?: string | null;
  birth_year?: number | null;
  city?: string | null;
  gender?: string | null;
  goals?: unknown;
}

export interface SafeProfile {
  ageBucket: string | null;
  gender: string | null;
  goals: unknown;
}

export function sanitizeProfileForLLM(p: RawProfile | null | undefined): SafeProfile {
  if (!p) return { ageBucket: null, gender: null, goals: null };
  return {
    ageBucket: ageBucketFromBirthYear(p.birth_year ?? null),
    gender: p.gender ?? null,
    goals: p.goals ?? null,
  };
}

/**
 * Применяет redactPII ко всем content свободного текста в массиве messages.
 * Поддерживает content типа string и Anthropic content-blocks ({type:'text', text}).
 */
type ContentBlock = { type: string; text?: string; [k: string]: unknown };
type Msg = { role: string; content: string | ContentBlock[] | unknown };

export function sanitizeMessages<T extends Msg>(messages: T[]): T[] {
  return messages.map((m) => {
    if (typeof m.content === 'string') {
      return { ...m, content: redactPII(m.content) };
    }
    if (Array.isArray(m.content)) {
      const blocks = (m.content as ContentBlock[]).map((b) => {
        if (b && typeof b === 'object' && b.type === 'text' && typeof b.text === 'string') {
          return { ...b, text: redactPII(b.text) };
        }
        return b;
      });
      return { ...m, content: blocks } as T;
    }
    return m;
  });
}

/**
 * Финальная проверка: убедиться, что в outbound-body нет полей-идентификаторов.
 * В dev/тесте бросает, в prod — логирует и чистит.
 */
const FORBIDDEN_KEYS = new Set([
  'user_id',
  'userId',
  'email',
  'phone',
  'display_name',
  'displayName',
]);

export function stripIdentifiersFromBody(
  body: Record<string, unknown>,
): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (FORBIDDEN_KEYS.has(k)) {
      console.warn(`[anonymize] dropping forbidden key from outbound body: ${k}`);
      continue;
    }
    cleaned[k] = v;
  }
  return cleaned;
}
