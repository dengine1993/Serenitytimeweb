import { assert, assertEquals, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  ageBucketFromBirthYear,
  pseudonymizeName,
  redactPII,
  sanitizeMessages,
  sanitizeProfileForLLM,
  stripIdentifiersFromBody,
} from './anonymize.ts';

Deno.test('redactPII: маскирует email', () => {
  const out = redactPII('Напиши мне на vasya.test+tag@mail.ru пожалуйста');
  assert(!out.includes('vasya'));
  assert(!out.includes('mail.ru'));
  assertStringIncludes(out, '[email]');
});

Deno.test('redactPII: маскирует RU телефон', () => {
  const out = redactPII('Звони +7 (999) 123-45-67 в любое время');
  assert(!/\d{3,}/.test(out), `остались цифры: ${out}`);
  assertStringIncludes(out, '[телефон]');
});

Deno.test('redactPII: маскирует ник и URL', () => {
  const out = redactPII('Найди меня @vasya_pupkin или https://vk.com/id123');
  assertStringIncludes(out, '[ник]');
  assertStringIncludes(out, '[ссылка]');
});

Deno.test('redactPII: маскирует карту', () => {
  const out = redactPII('Карта 4276 1600 1234 5678');
  assert(!out.includes('4276'));
});

Deno.test('redactPII: НЕ ломает обычный текст про чувства', () => {
  const text = 'Сегодня я грустил, потому что устал на работе и поссорился с другом.';
  assertEquals(redactPII(text), text);
});

Deno.test('ageBucketFromBirthYear: правильные диапазоны', () => {
  const now = new Date().getFullYear();
  assertEquals(ageBucketFromBirthYear(now - 20), '18-24');
  assertEquals(ageBucketFromBirthYear(now - 30), '25-34');
  assertEquals(ageBucketFromBirthYear(now - 60), '55+');
  assertEquals(ageBucketFromBirthYear(null), null);
  assertEquals(ageBucketFromBirthYear(1700), null);
});

Deno.test('sanitizeProfileForLLM: убирает display_name и city', () => {
  const safe = sanitizeProfileForLLM({
    display_name: 'Вася Петров',
    birth_year: 1995,
    city: 'Москва',
    gender: 'male',
    goals: ['mindfulness'],
  });
  const json = JSON.stringify(safe);
  assert(!json.includes('Вася'));
  assert(!json.includes('Москва'));
  assertEquals(safe.gender, 'male');
  assert(safe.ageBucket !== null);
});

Deno.test('pseudonymizeName: стабильность для одного seed', async () => {
  const a = await pseudonymizeName('uid-abc-123');
  const b = await pseudonymizeName('uid-abc-123');
  assertEquals(a, b);
});

Deno.test('sanitizeMessages: чистит string-content', () => {
  const out = sanitizeMessages([
    { role: 'user', content: 'мой email vasya@mail.ru' },
    { role: 'assistant', content: 'хорошо' },
  ]);
  assertStringIncludes(out[0].content as string, '[email]');
  assertEquals(out[1].content, 'хорошо');
});

Deno.test('sanitizeMessages: чистит content-blocks', () => {
  const out = sanitizeMessages([
    {
      role: 'system',
      content: [
        { type: 'text', text: 'звони +7 999 111 22 33' },
        { type: 'text', text: 'ок' },
      ],
    },
  ]);
  const blocks = out[0].content as Array<{ text: string }>;
  assertStringIncludes(blocks[0].text, '[телефон]');
  assertEquals(blocks[1].text, 'ок');
});

Deno.test('stripIdentifiersFromBody: удаляет запрещённые ключи', () => {
  const body = {
    model: 'x',
    messages: [],
    user_id: 'leak',
    email: 'a@b.c',
    temperature: 0.5,
  };
  const out = stripIdentifiersFromBody(body);
  assert(!('user_id' in out));
  assert(!('email' in out));
  assertEquals(out.model, 'x');
  assertEquals(out.temperature, 0.5);
});
