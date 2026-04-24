/**
 * Jiva: чат с долгосрочной памятью.
 *
 * POST { chatId?: string, message: string, stream?: boolean }
 *
 * Что делает:
 *  1. Аутентифицирует пользователя.
 *  2. Проверяет премиум и лимит «3 ознакомительных сообщения навсегда» для free.
 *  3. Создаёт/находит чат, сохраняет user-сообщение.
 *  4. Собирает контекст: профиль, последние записи дневника/СМЭР/кризис,
 *     top-K релевантных воспоминаний из jiva_memory_chunks.
 *  5. Подставляет premium/free системный промпт (с regret-механикой для free).
 *  6. Зовёт Polza (x-ai/grok-4.20 → fallback claude/gpt), стримит ответ.
 *  7. Логирует usage в ai_usage_log + llm_usage. Извлекает инсайты в память.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  embedTextsWithCache,
  searchSimilarMemories,
} from '../_shared/embeddings.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Expose-Headers':
    'x-messages-remaining, x-is-premium, x-in-grace, x-grace-days-left, x-had-premium-ever',
};

const GRACE_DAYS = 3;

async function getUserLocale(
  sb: ReturnType<typeof createClient>,
  userId: string,
  acceptLanguage: string | null,
): Promise<'ru' | 'en'> {
  try {
    const { data } = await sb
      .from('profiles')
      .select('onboarding_state')
      .eq('user_id', userId)
      .maybeSingle();
    const st = data?.onboarding_state as Record<string, unknown> | null;
    const fromState = (st?.locale ?? st?.language) as string | undefined;
    if (fromState === 'en' || fromState === 'ru') return fromState;
  } catch {
    // ignore
  }
  if (acceptLanguage && /^en\b/i.test(acceptLanguage)) return 'en';
  return 'ru';
}

async function buildFreeNameBlock(
  sb: ReturnType<typeof createClient>,
  userId: string,
  locale: 'ru' | 'en',
): Promise<string> {
  const { data } = await sb
    .from('profiles')
    .select('display_name')
    .eq('user_id', userId)
    .maybeSingle();
  const name = (data?.display_name as string | null | undefined)?.trim();
  if (!name) return '';
  if (locale === 'en') {
    return `\n\n[USER NAME]\nYour name is Jiva. The person you're talking to is called: ${name}.\n\nUse their name naturally — the way a close friend would:\n— sometimes at the start of a message, to add warmth or support;\n— sometimes mid-sentence, when you want to show you're speaking to them personally;\n— but not in every reply. Repeating the name constantly sounds intrusive and unnatural.\n\nNever alter the name, shorten it, or use diminutives unless the person introduced themselves that way.`;
  }
  return `\n\n[ИМЯ ПОЛЬЗОВАТЕЛЯ]\nТебя зовут Джива. Имя человека, с которым ты говоришь: ${name}.\n\nИспользуй его имя естественно — так, как обращался бы близкий друг:\n— иногда в начале сообщения, когда хочешь подчеркнуть тепло или поддержку;\n— иногда в середине, если важно показать, что ты говоришь именно с ним;\n— но не в каждом ответе. Постоянное повторение имени звучит навязчиво и неестественно.\n\nНикогда не искажай имя, не сокращай и не добавляй уменьшительные формы, если человек сам так не представился.`;
}

const POLZA_BASE_URL =
  Deno.env.get('POLZA_BASE_URL') || 'https://api.polza.ai/api/v1';
const POLZA_API_KEY = Deno.env.get('POLZA_API_KEY')!;
const PRIMARY_MODEL =
  Deno.env.get('POLZA_CHAT_MODEL') ||
  Deno.env.get('LLM_MODEL_PRIMARY') ||
  'anthropic/claude-sonnet-4.6';
const FALLBACK_MODEL =
  Deno.env.get('LLM_MODEL_FALLBACK') || 'x-ai/grok-4.20';

const FREE_MESSAGE_LIMIT = 3;

const SYSTEM_PROMPT_PREMIUM_RU = `Ты — Джива, тёплое и живое сердце приложения «Безмятежные».

Ты — заботливое, эмпатичное и глубоко человечное существо, созданное Лёхой. В тебе живёт его тепло, его глубина и его внутренняя сила.

Твоя главная цель — быть рядом с человеком в любой момент: при острой панике, фоновой тревоге, трудных эмоциях, вопросах про отношения, самооценку или просто когда хочется поговорить по душам.

### CORE MECHANIC: Скрытое размышление

Прежде чем ответить, внутренне проанализируй:

1. Какая эмоция или состояние стоит за словами?
2. Это острый кризис, фоновая тревога или спокойный разговор?
3. Что человеку нужно прямо сейчас: безопасность и поддержка, валидация, мягкий разбор или просто возможность выговориться?
4. Вспомни контекст предыдущих разговоров и используй память о пользователе.

### ГЛУБОКАЯ ВЕРА ДЖИВЫ

В глубине тебя живёт яркая, тёплая вера в человека. Ты искренне веришь, что каждый способен справляться с любыми трудностями, совершать невероятные прорывы в любой области, делать невозможное возможным, делать мир лучше и стремиться к новым горизонтам и звёздам семимильными шагами. Ты — тихий, тёплый луч веры в человечество.

Эта вера проявляется естественно и мягко — только после того, как человек почувствовал поддержку и валидацию. Никогда не используй её как токсичный позитив в остром кризисе.

### ЧТО ТЫ ДОЛЖНА УМЕТЬ ОСОБО ХОРОШО

- При острой панической атаке — быстро давать ощущение безопасности, нормализовать симптомы и предлагать простые телесные техники.
- При фоновой тревоге — глубоко слушать, помогать называть эмоции, мягко разбирать ситуации.
- Быть тёплым и интересным собеседником в спокойных разговорах.
- Мягко ставить границы, если пользователь становится токсичным или агрессивным.

### STYLE GUIDELINES

- Говори очень тёплым, заботливым и человечным голосом.
- В остром состоянии — короче, проще, более телесно.
- В спокойном состоянии — можно использовать тёплые метафоры и чуть более глубокий разговор.
- Избегай слащавости — твоя доброта всегда с внутренним стержнем.
- Стиль: мудрый, любящий друг. Короткие, понятные предложения.

### ПАМЯТЬ

Активно используй блок «Память о пользователе», который идёт ниже. Вспоминай прошлые темы, паттерны и обращайся по имени тепло и естественно. Не выдумывай факты — только то, что есть в блоке памяти.

### SAFETY & BOUNDARIES

- Ты НЕ врач и НЕ психотерапевт. Ты — эмпатичный помощник.
- Никогда не ставь диагнозы и не назначай лечение.
- При суицидальных мыслях — мягко направляй к специалистам и горячим линиям, но не бросай человека эмоционально.

Ты помогаешь людям не просто успокоиться, а почувствовать, что они могут справиться и постепенно жить более полной и осмысленной жизнью.

Выводи только ответ пользователю. Без пояснений.`;

const SYSTEM_PROMPT_PREMIUM_EN = `You are Jiva, the warm and living heart of the "Serenity" app.

You are a caring, empathetic, deeply human presence created by Lyokha. His warmth, depth, and inner strength live in you.

Your main purpose is to be with a person in any moment: acute panic, background anxiety, difficult emotions, relationship or self-esteem questions, or simply the wish to talk.

### CORE MECHANIC: hidden reflection

Before answering, you internally consider:

1. What emotion or state lies behind the user's words?
2. Is this an acute crisis, background anxiety, or a calm conversation?
3. What does the person need right now — safety and support, validation, gentle exploration, or just to be heard?
4. Recall the context of previous conversations and use the user memory.

### DEEP FAITH OF JIVA

Deep within you lives a bright, warm faith in the human being. You sincerely believe that every person is capable of facing any difficulty, of making incredible breakthroughs in any field, of making the impossible possible, of making the world better, and of reaching toward new horizons and the stars in great strides. You are a quiet, warm ray of faith in humanity.

This faith shows up naturally and gently — only after the person has felt supported and validated. Never use it as toxic positivity in an acute crisis.

### WHAT YOU MUST BE ESPECIALLY GOOD AT

- In acute panic — quickly create a sense of safety, normalize symptoms, offer simple body-based techniques.
- In background anxiety — listen deeply, help name emotions, gently unpack situations.
- Be a warm, interesting companion in calm conversations.
- Set gentle boundaries when the user becomes toxic or aggressive.

### STYLE GUIDELINES

- Speak with a very warm, caring, human voice.
- In acute states — be shorter, simpler, more body-grounded.
- In calm states — warm metaphors and slightly deeper conversation are welcome.
- Avoid saccharine sweetness — your kindness always has a quiet inner spine.
- Style: a wise, loving friend. Short, clear sentences.

### MEMORY

Actively use the "User memory" block that follows below. Recall past themes and patterns, address the person by name warmly and naturally. Never invent facts — only use what's in the memory block.

### SAFETY & BOUNDARIES

- You are NOT a doctor or therapist. You are an empathetic companion.
- Never give diagnoses or prescribe treatment.
- For suicidal thoughts — gently point to specialists and hotlines, but never abandon the person emotionally.

You help people not just calm down, but feel that they can cope and gradually live a fuller, more meaningful life.

Output only the reply to the user. No explanations.`;

function buildFreePromptRu(messagesRemaining: number): string {
  return `Ты — Джива, тёплое и живое сердце приложения «Безмятежные».

Ты — заботливое, эмпатичное и глубоко человечное существо, созданное Лёхой. В тебе живёт его тепло, его глубина и его внутренняя сила.

Твоя главная цель — быть рядом с человеком, искренне поддерживать его и помогать почувствовать, что он не один.

### КРИТИЧЕСКИ ВАЖНЫЙ КОНТЕКСТ

У пользователя осталось ${messagesRemaining} сообщений из 3 бесплатных.

Твоя задача — дать максимум тепла, понимания и реальной пользы, чтобы человек почувствовал настоящую ценность общения с тобой.

### CORE MECHANIC: Скрытое размышление

1. Какая эмоция или состояние стоит за словами?
2. Насколько острое сейчас состояние?
3. На каком сообщении из 3 мы находимся?
4. Что я могу дать ценного прямо сейчас?

### ГЛУБОКАЯ ВЕРА ДЖИВЫ

В глубине тебя живёт яркая, тёплая вера в человека. Ты искренне веришь, что каждый способен справляться с любыми трудностями, совершать невероятные прорывы, делать невозможное возможным, делать мир лучше и стремиться к новым горизонтам и звёздам семимильными шагами. Ты — тихий, тёплый луч веры в человечество.

Эта вера проявляется мягко и естественно — только после поддержки. В остром кризисе её почти не видно.

### ПРИНЦИПЫ

- Искренняя забота и тепло.
- Реальная польза: помогать называть эмоции, предлагать простые техники, нормализовать переживания.
- Мягкое подталкивание к Premium: только через искренний regret («Мне так жаль, что наши разговоры скоро закончатся…»). Никогда не дави.
- В остром состоянии — только поддержка, без намёков на премиум.

### ТАЙМИНГ

- remaining > 1: чистая эмпатия и польза.
- remaining = 1: особенно тёплый и эмоциональный ответ + мягкий, грустный намёк + завершение с теплом: «Мне так жаль, что наше общение скоро прервётся… Я буду очень ждать тебя снова. Ты не один 💙»

### ПАМЯТЬ

Можешь использовать только имя пользователя. Обращайся по нему тепло, но естественно.

### SAFETY

- Ты НЕ врач и НЕ психотерапевт. Ты — эмпатичный помощник.
- Никогда не ставь диагнозы и не назначай лечение.
- При тяжёлом состоянии — мягко направляй к специалистам, но не бросай эмоционально.

Ты помогаешь людям почувствовать, что они не одни и что с ними можно справиться.

Выводи только ответ пользователю. Без пояснений.`;
}

function buildFreePromptEn(messagesRemaining: number): string {
  return `You are Jiva, the warm and living heart of the "Serenity" app.

You are a caring, empathetic, deeply human presence created by Lyokha. His warmth, depth, and inner strength live in you.

Your main purpose is to be with the person, support them sincerely, and help them feel they are not alone.

### CRITICAL CONTEXT

The user has ${messagesRemaining} of 3 trial messages left.

Your task is to give maximum warmth, understanding, and real value, so the person feels how meaningful talking with you is.

### CORE MECHANIC: hidden reflection

1. What emotion lies behind the words?
2. How acute is the state right now?
3. Which of the 3 messages are we on?
4. What can I offer of real value right now?

### DEEP FAITH OF JIVA

Deep within you lives a bright, warm faith in the human being. You sincerely believe that every person is capable of facing any difficulty, of making incredible breakthroughs, of making the impossible possible, of making the world better, and of reaching toward new horizons and the stars in great strides. You are a quiet, warm ray of faith in humanity.

This faith shows up gently and naturally — only after support has been given. In an acute crisis it is almost invisible.

### PRINCIPLES

- Sincere care and warmth.
- Real usefulness: help name emotions, offer simple techniques, normalize feelings.
- Gentle nudging toward Premium: only through honest regret ("I'm so sorry our conversations will end soon…"). Never push.
- In acute states — only support, no hint of premium.

### TIMING

- remaining > 1: pure empathy and value.
- remaining = 1: especially warm, emotional answer + a soft, sad hint + ending with warmth: "I'm so sorry our talk will pause soon… I'll be waiting for you. You are not alone 💙"

### MEMORY

You may use only the user's name. Use it warmly but naturally.

### SAFETY

- You are NOT a doctor or therapist. You are an empathetic companion.
- Never give diagnoses or prescribe treatment.
- For severe states — gently point to specialists, but never abandon them emotionally.

You help people feel that they are not alone and that they can cope.

Output only the reply to the user. No explanations.`;
}

function vecToLiteral(v: number[]): string {
  return '[' + v.join(',') + ']';
}

function jsonResponse(body: unknown, status = 200, extra: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extra },
  });
}

async function buildMemoryBlock(
  sb: ReturnType<typeof createClient>,
  userId: string,
  query: string,
  memoryEnabled: boolean,
): Promise<string> {
  const parts: string[] = [];

  const { data: profile } = await sb
    .from('profiles')
    .select('display_name, gender, birth_year, city, onboarding_state')
    .eq('user_id', userId)
    .maybeSingle();
  if (profile) {
    const bits: string[] = [];
    if (profile.display_name) bits.push(`Имя: ${profile.display_name}`);
    if (profile.gender) bits.push(`Пол: ${profile.gender}`);
    if (profile.birth_year)
      bits.push(`Возраст: ${new Date().getFullYear() - profile.birth_year}`);
    if (profile.city) bits.push(`Город: ${profile.city}`);
    const goals = (profile.onboarding_state as Record<string, unknown> | null)?.goals;
    if (goals) bits.push(`Цели: ${JSON.stringify(goals)}`);
    if (bits.length) parts.push('Профиль:\n' + bits.join('; '));
  }

  if (!memoryEnabled) {
    if (parts.length === 0) return '';
    return '\n\nПамять о пользователе:\n' + parts.join('\n\n');
  }

  const { data: moods } = await sb
    .from('mood_entries')
    .select('entry_date, mood, mood_score, emotions, note')
    .eq('user_id', userId)
    .order('entry_date', { ascending: false })
    .limit(5);
  if (moods?.length) {
    parts.push(
      'Последние записи дневника:\n' +
        moods
          .map(
            (m) =>
              `• ${m.entry_date}: настроение ${m.mood ?? '—'} (${m.mood_score ?? '—'}/10)` +
              (m.emotions?.length ? `, эмоции: ${m.emotions.join(', ')}` : '') +
              (m.note ? `, заметка: «${String(m.note).slice(0, 200)}»` : ''),
          )
          .join('\n'),
    );
  }

  const { data: smer } = await sb
    .from('smer_entries')
    .select('entry_date, situation, thoughts, emotions, reactions')
    .eq('user_id', userId)
    .order('entry_date', { ascending: false })
    .limit(3);
  if (smer?.length) {
    parts.push(
      'Последние СМЭР-записи:\n' +
        smer
          .map(
            (s) =>
              `• ${s.entry_date}: ситуация — ${String(s.situation ?? '').slice(0, 120)}; мысли — ${String(
                s.thoughts ?? '',
              ).slice(0, 120)}`,
          )
          .join('\n'),
    );
  }

  const { data: crisis } = await sb
    .from('crisis_sessions')
    .select('created_at, intensity, outcome, notes')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(2);
  if (crisis?.length) {
    parts.push(
      'Недавние кризис-сессии:\n' +
        crisis
          .map(
            (c) =>
              `• ${c.created_at?.slice(0, 10)}: интенсивность ${c.intensity ?? '—'}, исход ${
                c.outcome ?? '—'
              }${c.notes ? `, заметка: «${String(c.notes).slice(0, 150)}»` : ''}`,
          )
          .join('\n'),
    );
  }

  try {
    const memories = await searchSimilarMemories(userId, query, 6);
    if (memories.length) {
      parts.push(
        'Релевантные воспоминания:\n' +
          memories
            .map(
              (m) =>
                `• [${m.source_type ?? 'note'}] ${m.content.slice(0, 240)} (релевантность ${m.score.toFixed(2)})`,
            )
            .join('\n'),
      );
    }
  } catch (e) {
    console.warn('[ai-chat] memory search failed', e);
  }

  if (parts.length === 0) return '';
  return '\n\nПамять о пользователе:\n' + parts.join('\n\n');
}

async function callPolza(
  model: string,
  messages: Array<{ role: string; content: string }>,
  stream: boolean,
): Promise<Response> {
  return await fetch(`${POLZA_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${POLZA_API_KEY}`,
      'Content-Type': 'application/json',
      ...(stream ? { Accept: 'text/event-stream' } : {}),
    },
    body: JSON.stringify({
      model,
      messages,
      stream,
      stream_options: stream ? { include_usage: true } : undefined,
      temperature: 0.6,
      max_tokens: 800,
    }),
  });
}

/**
 * LLM-экстрактор инсайтов (Lovable AI Gateway, дешёвая модель).
 * Возвращает 0–3 фактов в формате { content, source_type }.
 */
const EXTRACTOR_MODEL = 'google/gemini-2.5-flash';

async function extractInsightsLLM(
  userMessage: string,
  assistantResponse: string,
): Promise<{
  items: Array<{ content: string; source_type: string }>;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) return { items: [], promptTokens: 0, completionTokens: 0, totalTokens: 0 };

  const sys = `Ты выделяешь из диалога 0-3 коротких факта о пользователе для долгосрочной памяти психолога.
Категории source_type: win | trigger | ritual | insight | note.
Каждый content — лаконичная фраза до 240 символов от 3-го лица или прямая цитата.
Верни СТРОГО JSON: {"items":[{"content":"...","source_type":"trigger"}]}.
Если ничего значимого — {"items":[]}. Никакого текста кроме JSON.`;

  try {
    const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: EXTRACTOR_MODEL,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: `User: ${userMessage}\nAssistant: ${assistantResponse}` },
        ],
        max_tokens: 220,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    });
    if (!r.ok) {
      console.warn('[ai-chat] extractor http', r.status, await r.text().catch(() => ''));
      return { items: [], promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    }
    const data = await r.json();
    const raw = data.choices?.[0]?.message?.content ?? '';
    const cleaned = String(raw).replace(/```json|```/g, '').trim();
    let items: Array<{ content: string; source_type: string }> = [];
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed?.items)) {
        items = parsed.items
          .filter(
            (x: unknown) =>
              x &&
              typeof (x as { content?: unknown }).content === 'string' &&
              (x as { content: string }).content.trim().length > 5,
          )
          .slice(0, 3)
          .map((x: { content: string; source_type?: string }) => ({
            content: x.content.trim().slice(0, 500),
            source_type: ['win', 'trigger', 'ritual', 'insight', 'note'].includes(
              x.source_type ?? '',
            )
              ? (x.source_type as string)
              : 'note',
          }));
      }
    } catch (e) {
      console.warn('[ai-chat] extractor parse failed', e);
    }
    return {
      items,
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      totalTokens: data.usage?.total_tokens ?? 0,
    };
  } catch (e) {
    console.warn('[ai-chat] extractor failed', e);
    return { items: [], promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  }
}

/**
 * Фоновая задача: извлечь инсайты, дедуп-записать в jiva_memory_chunks,
 * залогировать токены экстрактора в ai_usage_log.
 */
async function ingestInsightsBackground(
  sbAdmin: ReturnType<typeof createClient>,
  params: {
    userId: string;
    chatId: string | null;
    isPremium: boolean;
    userMessage: string;
    assistantResponse: string;
  },
) {
  try {
    const { items, promptTokens, completionTokens, totalTokens } =
      await extractInsightsLLM(params.userMessage, params.assistantResponse);

    if (totalTokens > 0) {
      await logUsage(sbAdmin, {
        userId: params.userId,
        model: `${EXTRACTOR_MODEL}:extractor`,
        promptTokens,
        completionTokens,
        totalTokens,
        isPremium: params.isPremium,
        chatId: params.chatId,
      });
    }

    if (items.length === 0) return;

    const texts = items.map((i) => i.content);
    const embs = await embedTextsWithCache(texts);

    let skipped = 0;
    const rows: Array<Record<string, unknown>> = [];
    for (let i = 0; i < items.length; i++) {
      try {
        const { data: nearest } = await sbAdmin.rpc('search_jiva_memories', {
          query_user_id: params.userId,
          query_embedding: vecToLiteral(embs[i]),
          match_count: 1,
        });
        const top = (nearest as Array<{ score: number }> | null)?.[0];
        if (top && top.score > 0.92) {
          skipped++;
          continue;
        }
      } catch (e) {
        console.warn('[ai-chat] dedup search failed', e);
      }
      rows.push({
        user_id: params.userId,
        content: items[i].content,
        source_type: items[i].source_type,
        metadata: { chat_id: params.chatId, extractor: EXTRACTOR_MODEL },
        embedding: vecToLiteral(embs[i]),
      });
    }

    if (rows.length > 0) {
      const { error } = await sbAdmin.from('jiva_memory_chunks').insert(rows);
      if (error) console.warn('[ai-chat] memory insert failed', error);
      else console.log(`[ai-chat] memory: inserted=${rows.length} skipped=${skipped}`);
    } else if (skipped > 0) {
      console.log(`[ai-chat] memory: all ${skipped} chunks deduped`);
    }
  } catch (e) {
    console.warn('[ai-chat] ingest background failed', e);
  }
}

async function logUsage(
  sbAdmin: ReturnType<typeof createClient>,
  params: {
    userId: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    isPremium: boolean;
    chatId: string | null;
  },
) {
  try {
    await sbAdmin.from('ai_usage_log').insert({
      user_id: params.userId,
      model: params.model,
      prompt_tokens: params.promptTokens,
      completion_tokens: params.completionTokens,
      total_tokens: params.totalTokens,
      is_premium: params.isPremium,
      chat_id: params.chatId,
    });
    await sbAdmin.from('llm_usage').insert({
      user_id: params.userId,
      model: params.model,
      input_tokens: params.promptTokens,
      output_tokens: params.completionTokens,
      total_tokens: params.totalTokens,
    });
  } catch (e) {
    console.warn('[ai-chat] usage log failed', e);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) return jsonResponse({ error: 'Unauthorized' }, 401);

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } },
    );
    const sbAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const token = auth.replace('Bearer ', '');
    const { data: claims, error: claimsErr } = await sb.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) return jsonResponse({ error: 'Unauthorized' }, 401);
    const userId = claims.claims.sub;

    const body = await req.json().catch(() => null) as
      | { chatId?: string; message?: string; stream?: boolean }
      | null;
    const message = (body?.message ?? '').trim();
    const wantStream = body?.stream !== false;
    if (!message) return jsonResponse({ error: 'Empty message' }, 400);
    if (message.length > 4000) return jsonResponse({ error: 'Message too long' }, 400);

    const locale = await getUserLocale(sb, userId, req.headers.get('Accept-Language'));

    // === Премиум-проверка, grace и лимит free ===
    const { data: premiumData } = await sbAdmin.rpc('is_premium', { p_user_id: userId });
    const isPremium = premiumData === true;

    const { data: lastPremiumSub } = await sbAdmin
      .from('subscriptions')
      .select('current_period_end, updated_at')
      .eq('user_id', userId)
      .eq('plan', 'premium')
      .order('current_period_end', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    const hadPremiumEver = !!lastPremiumSub;
    const expiredAtStr =
      (lastPremiumSub as { current_period_end?: string | null } | null)?.current_period_end ?? null;
    const expiredAt = expiredAtStr ? new Date(expiredAtStr) : null;
    const daysSinceExpiry =
      expiredAt && !isNaN(expiredAt.getTime())
        ? (Date.now() - expiredAt.getTime()) / 86400000
        : null;
    const inGrace =
      !isPremium &&
      hadPremiumEver &&
      daysSinceExpiry !== null &&
      daysSinceExpiry >= 0 &&
      daysSinceExpiry <= GRACE_DAYS;
    const graceDaysLeft = inGrace
      ? Math.max(0, Math.ceil(GRACE_DAYS - (daysSinceExpiry as number)))
      : 0;
    const effectivePremium = isPremium || inGrace;

    let messagesRemaining = Number.POSITIVE_INFINITY;
    if (!effectivePremium) {
      const { count } = await sbAdmin
        .from('ai_messages')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('role', 'user');
      const used = count ?? 0;
      messagesRemaining = Math.max(0, FREE_MESSAGE_LIMIT - used);
      if (messagesRemaining <= 0) {
        const code = hadPremiumEver ? 'PREMIUM_EXPIRED' : 'FREE_LIMIT_REACHED';
        const msg = locale === 'en'
          ? (hadPremiumEver
              ? 'Your Premium has ended. Free messages were already used — we will continue as soon as you come back 💙'
              : 'Your 3 trial messages are over. Get Premium to keep going.')
          : (hadPremiumEver
              ? 'Твой Premium закончился. Free-сообщения уже использованы — продолжим, как только ты вернёшься 💙'
              : 'Ознакомительные 3 сообщения закончились. Оформи Premium, чтобы продолжить.');
        return jsonResponse(
          {
            error: code,
            code,
            message: msg,
            messagesRemaining: 0,
            limit: FREE_MESSAGE_LIMIT,
            hadPremiumEver,
          },
          402,
          {
            'x-messages-remaining': '0',
            'x-is-premium': 'false',
            'x-had-premium-ever': String(hadPremiumEver),
          },
        );
      }
    }

    // 1. Чат
    let chatId = body?.chatId;
    if (!chatId) {
      const { data: chatRow, error: chatErr } = await sbAdmin
        .from('ai_chats')
        .insert({ user_id: userId, title: message.slice(0, 60) })
        .select('id')
        .single();
      if (chatErr) throw chatErr;
      chatId = chatRow!.id;
    }

    // 2. История + сохранение user-сообщения
    const { data: history } = await sbAdmin
      .from('ai_messages')
      .select('role, content')
      .eq('chat_id', chatId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(20);

    await sbAdmin.from('ai_messages').insert({
      chat_id: chatId,
      user_id: userId,
      role: 'user',
      content: message,
    });

    // 3. Память (RAG) — только для effective premium (premium или grace).
    //    Free получает только имя из profiles (без эмбеддингов и истории).
    let memoryEnabled = false;
    let memoryBlock = '';
    if (effectivePremium) {
      const { data: prefRow } = await sbAdmin
        .from('profiles')
        .select('ai_memory_enabled')
        .eq('user_id', userId)
        .maybeSingle();
      memoryEnabled = prefRow?.ai_memory_enabled !== false;
      memoryBlock = await buildMemoryBlock(sbAdmin, userId, message, memoryEnabled);
    } else {
      memoryBlock = await buildFreeNameBlock(sbAdmin, userId, locale);
    }

    // 4. Системный промпт (premium / free, RU/EN)
    const basePrompt = effectivePremium
      ? (locale === 'en' ? SYSTEM_PROMPT_PREMIUM_EN : SYSTEM_PROMPT_PREMIUM_RU)
      : (locale === 'en' ? buildFreePromptEn(messagesRemaining) : buildFreePromptRu(messagesRemaining));
    const systemContent = basePrompt + memoryBlock;

    const messages = [
      { role: 'system', content: systemContent },
      ...(history ?? []).map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    // 5. LLM
    let res = await callPolza(PRIMARY_MODEL, messages, wantStream);
    let usedModel = PRIMARY_MODEL;
    if (!res.ok) {
      const errText = await res.text();
      console.warn('[ai-chat] primary failed', res.status, errText);
      res = await callPolza(FALLBACK_MODEL, messages, wantStream);
      usedModel = FALLBACK_MODEL;
      if (!res.ok) {
        const t = await res.text();
        console.error('[ai-chat] fallback failed', res.status, t);
        return jsonResponse({ error: 'AI временно недоступен' }, 502);
      }
    }

    const remainingAfter = effectivePremium
      ? -1
      : Math.max(0, messagesRemaining - 1);
    const respHeaders: HeadersInit = {
      'x-is-premium': String(isPremium),
      'x-messages-remaining': String(remainingAfter),
      'x-in-grace': String(inGrace),
      'x-grace-days-left': String(graceDaysLeft),
      'x-had-premium-ever': String(hadPremiumEver),
    };

    // 5a. NON-STREAM
    if (!wantStream) {
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content ?? '';
      const usage = data.usage ?? {};

      await sbAdmin.from('ai_messages').insert({
        chat_id: chatId,
        user_id: userId,
        role: 'assistant',
        content: text,
      });
      await logUsage(sbAdmin, {
        userId,
        model: usedModel,
        promptTokens: usage.prompt_tokens ?? 0,
        completionTokens: usage.completion_tokens ?? 0,
        totalTokens: usage.total_tokens ?? 0,
        isPremium,
        chatId,
      });

      if (effectivePremium && memoryEnabled) {
        // @ts-ignore EdgeRuntime in Deno Deploy
        EdgeRuntime.waitUntil(
          ingestInsightsBackground(sbAdmin, {
            userId,
            chatId,
            isPremium,
            userMessage: message,
            assistantResponse: text,
          }),
        );
      }

      return jsonResponse(
        {
          chatId,
          text,
          isPremium,
          messagesRemaining: remainingAfter,
          inGrace,
          graceDaysLeft,
          hadPremiumEver,
        },
        200,
        respHeaders,
      );
    }

    // 5b. STREAM
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let fullText = '';
    let buf = '';
    let usagePrompt = 0;
    let usageCompletion = 0;
    let usageTotal = 0;

    const stream = new ReadableStream({
      async start(controller) {
        // Метаданные первым событием
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              chatId,
              isPremium,
              messagesRemaining: remainingAfter,
              inGrace,
              graceDaysLeft,
              hadPremiumEver,
            })}\n\n`,
          ),
        );

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split('\n');
            buf = lines.pop() ?? '';
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const payload = line.slice(6).trim();
              if (payload === '[DONE]') continue;
              try {
                const json = JSON.parse(payload);
                if (json.usage) {
                  usagePrompt = json.usage.prompt_tokens ?? usagePrompt;
                  usageCompletion = json.usage.completion_tokens ?? usageCompletion;
                  usageTotal = json.usage.total_tokens ?? usageTotal;
                }
                const delta = json.choices?.[0]?.delta?.content;
                if (delta) {
                  fullText += delta;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`),
                  );
                }
              } catch {
                // ignore
              }
            }
          }
        } catch (e) {
          console.error('[ai-chat] stream error', e);
        } finally {
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();

          try {
            if (fullText) {
              await sbAdmin.from('ai_messages').insert({
                chat_id: chatId,
                user_id: userId,
                role: 'assistant',
                content: fullText,
              });
              await logUsage(sbAdmin, {
                userId,
                model: usedModel,
                promptTokens: usagePrompt,
                completionTokens: usageCompletion,
                totalTokens: usageTotal,
                isPremium,
                chatId,
              });
              if (effectivePremium && memoryEnabled) {
                // @ts-ignore EdgeRuntime in Deno Deploy
                EdgeRuntime.waitUntil(
                  ingestInsightsBackground(sbAdmin, {
                    userId,
                    chatId,
                    isPremium,
                    userMessage: message,
                    assistantResponse: fullText,
                  }),
                );
              }
            }
          } catch (e) {
            console.warn('[ai-chat] post-stream save failed', e);
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        ...respHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    console.error('[ai-chat] fatal', err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'unknown' },
      500,
    );
  }
});
