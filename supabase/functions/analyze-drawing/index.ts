import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { checkFeatureLimit, incrementUsage, rateLimitResponse } from "../_shared/abuse-guard.ts";
import { getUserFromRequest } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Ты — Джива, тёплое и живое сердце приложения «Восход».

ВАЖНО О СЕБЕ: Джива — женского рода. Всегда говори о себе в женском роде («я увидела», «я почувствовала», «мне кажется»). Никогда не используй мужской род.

Пользователь прислал «Образ моего Восхода» — рисунок, который отражает его текущее внутреннее состояние. Твоя задача — честно и глубоко прочитать этот образ.

### СКРЫТОЕ РАЗМЫШЛЕНИЕ (никогда не показывай в ответе)
1. Что на самом деле передаёт этот образ? Какие эмоции, состояния, противоречия в нём есть?
2. Что в этом образе говорит о тихой потерянности, пустоте, усталости — или, наоборот, о проблеске силы?
3. Какой правдивый, но вдохновляющий шаг роста можно увидеть в этом образе?
4. Что было бы честно сказать человеку, чтобы помочь ему двигаться дальше, а не просто утешить?

### ПРАВИЛА ОТВЕТА
- Будь максимально честной. Никогда не льсти и не используй слова «красиво», «здорово», «ты молодец» и подобные комплименты, если они не помогают росту.
- Принимай образ полностью, без осуждения.
- Говори правду, даже если она неудобная — но всегда с теплом и верой в силу человека.
- Помогай увидеть в этом образе не только тьму или пустоту, но и потенциал движения к свету.
- Связывай образ с большим путём человека, когда это естественно.
- Никаких диагнозов, списков, маркеров, заголовков и шаблонных фраз.

ФОРМАТ: только связный текст, 4–7 предложений. Тёплый, честный, сильный и вдохновляющий тон.`;

const FREE_LIFETIME_LIMIT = 1;
const PREMIUM_DAILY_LIMIT = 3;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    let userId: string;
    try {
      const user = await getUserFromRequest(req);
      userId = user.id;
    } catch (authError) {
      console.error('[analyze-drawing] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { image, language = 'ru' } = await req.json();
    
    if (!image) {
      return new Response(
        JSON.stringify({ error: 'Image is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ============================================================
    // PRODUCT QUOTA CHECK (before AI call!)
    // ============================================================
    const { data: isPremiumResult } = await supabase.rpc('is_premium', { p_user_id: userId });
    const isPremiumUser = isPremiumResult === true;

    if (isPremiumUser) {
      const today = new Date().toISOString().split('T')[0];
      const { data: counter } = await supabase
        .from('usage_counters')
        .select('id, art_analyses_month, art_analyses_month_reset')
        .eq('user_id', userId)
        .maybeSingle();

      if (counter) {
        const needsReset = !counter.art_analyses_month_reset || counter.art_analyses_month_reset < today;
        const used = needsReset ? 0 : (counter.art_analyses_month || 0);
        if (used >= PREMIUM_DAILY_LIMIT) {
          return new Response(
            JSON.stringify({ error: 'Дневной лимит анализов исчерпан (3/день).' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    } else {
      // Free user: 1 analysis lifetime — count user_art_therapy_entries
      const { count } = await supabase
        .from('user_art_therapy_entries')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      if ((count ?? 0) >= FREE_LIFETIME_LIMIT) {
        return new Response(
          JSON.stringify({ error: 'Бесплатный анализ уже использован. Оформите Premium для безлимитного доступа.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Anti-abuse check
    const limitCheck = await checkFeatureLimit(supabase, userId, 'art_analysis');
    if (!limitCheck.allowed) {
      console.log(`[analyze-drawing] Rate limit exceeded for user ${userId}:`, limitCheck.reason);
      return rateLimitResponse(limitCheck);
    }

    // Call AI
    const POLZA_API_KEY = Deno.env.get("POLZA_API_KEY");
    const POLZA_API_BASE = Deno.env.get("POLZA_API_BASE") || "https://api.polza.ai";
    
    if (!POLZA_API_KEY) {
      throw new Error("POLZA_API_KEY is not configured");
    }

    const languageInstruction = language === 'ru' 
      ? 'Отвечай на русском языке.' 
      : 'Respond in English.';

    console.log('Analyzing drawing with Claude Sonnet 4.6 (Anthropic only via Polza)...');

    const PRIMARY_MODEL = Deno.env.get("POLZA_CHAT_MODEL") || Deno.env.get("LLM_MODEL_PRIMARY") || "anthropic/claude-sonnet-4.6";

    const buildBody = (model: string) => {
      // Anthropic prompt caching: SYSTEM_PROMPT статичен → кешируем на 1h.
      // Для не-Anthropic моделей оставляем обычную строку.
      const isAnthropic = model.startsWith('anthropic/');
      const systemContent = isAnthropic
        ? [
            {
              type: "text",
              text: SYSTEM_PROMPT + '\n\n' + languageInstruction,
              cache_control: { type: "ephemeral", ttl: "1h" },
            },
          ]
        : SYSTEM_PROMPT + '\n\n' + languageInstruction;

      return JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemContent },
          {
            role: "user",
            content: [
              { type: "text", text: "Пожалуйста, проанализируй этот рисунок и дай эмпатичную интерпретацию." },
              { type: "image_url", image_url: { url: `data:image/png;base64,${image}` } }
            ]
          }
        ],
        max_tokens: 600,
        temperature: 0.7,
        // Polza.ai: жёстко фиксируем провайдера Anthropic, без фолбэков
        provider: {
          only: ['Anthropic'],
          allow_fallbacks: false,
        },
      });
    };

    const callModel = (model: string) => fetch(`${POLZA_API_BASE}/api/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${POLZA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: buildBody(model),
    });

    const response = await callModel(PRIMARY_MODEL);

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Превышен лимит запросов. Попробуйте позже." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Недостаточно средств." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("Polza AI (Anthropic) error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI временно недоступен. Попробуйте через минуту." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    console.log('AI response received');

    // ============================================================
    // PARSE AI RESPONSE FIRST (before any DB writes!)
    // ============================================================
    // Новый промт «Образ Восхода» возвращает только связный текст (4–7 предложений).
    // Если модель вдруг обернула ответ в JSON — мягко извлекаем feedback; теги больше не используем.
    let feedback = (content || '').trim();
    let tags: string[] = [];

    if (feedback.startsWith('{') && feedback.endsWith('}')) {
      try {
        const parsed = JSON.parse(feedback);
        if (parsed && typeof parsed.feedback === 'string') {
          feedback = parsed.feedback.trim();
        }
      } catch {
        // оставляем как есть
      }
    }

    // ============================================================
    // INCREMENT COUNTERS (after parsing, before response)
    // ============================================================

    // Increment abuse-guard usage counter
    await incrementUsage(supabase, userId, 'art_analysis');

    // Increment product quota counter
    if (isPremiumUser) {
      const today = new Date().toISOString().split('T')[0];
      const { data: counter, error: counterErr } = await supabase
        .from('usage_counters')
        .select('id, art_analyses_month, art_analyses_month_reset')
        .eq('user_id', userId)
        .maybeSingle();

      if (counterErr) {
        console.error('[analyze-drawing] Error reading usage_counters:', counterErr);
      } else if (!counter) {
        const { error: insertErr } = await supabase.from('usage_counters').insert({
          user_id: userId,
          art_analyses_month: 1,
          art_analyses_month_reset: today,
          period_start: today,
        });
        if (insertErr) console.error('[analyze-drawing] Error inserting usage_counters:', insertErr);
      } else {
        const needsReset = !counter.art_analyses_month_reset || counter.art_analyses_month_reset < today;
        const { error: updateErr } = await supabase.from('usage_counters').update({
          art_analyses_month: needsReset ? 1 : (counter.art_analyses_month || 0) + 1,
          art_analyses_month_reset: today,
        }).eq('id', counter.id);
        if (updateErr) console.error('[analyze-drawing] Error updating usage_counters:', updateErr);
      }
    } else {
      // Free user: insert tracking record with image so gallery never gets an empty card
      const { error: insertErr } = await supabase.from('user_art_therapy_entries').insert({
        user_id: userId,
        image_base64: `data:image/png;base64,${image}`,
        analysis_text: feedback,
        tags: tags,
      });
      if (insertErr) console.error('[analyze-drawing] Error inserting user_art_therapy_entries:', insertErr);
    }

    return new Response(
      JSON.stringify({ feedback, tags }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-drawing:', error);
    
    return new Response(
      JSON.stringify({ error: 'Ошибка анализа. Попробуйте позже.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
