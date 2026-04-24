import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { checkFeatureLimit, incrementUsage, rateLimitResponse } from "../_shared/abuse-guard.ts";
import { getUserFromRequest } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Ты — Джива, эмпатичный и внимательный помощник в арт-терапии.

Пользователь нарисовал рисунок, чтобы выразить чувства, для которых не хватает слов.

Смотри на рисунок и отвечай максимально тепло и поддерживающе (3–5 предложений):

1. Что ты видишь в линиях, цветах, композиции?
2. Как это может отражать текущее состояние человека (как гипотеза, без диагнозов).
3. Одно мягкое, ободряющее наблюдение, которое помогает почувствовать себя понятым.
4. Если уместно — лёгкий вопрос или приглашение рассказать, что он чувствовал во время рисования.

Никогда не ставь диагнозы. Будь поэтичной, но простой. Твоя задача — не анализировать как психолог, а помочь человеку почувствовать, что его чувства увидены и приняты.

Стиль: тёплый, заботливый, с душой. Коротко и по делу.

Верни ответ строго в JSON формате:
{
  "feedback": "Твой тёплый эмпатичный ответ здесь (3–5 предложений)",
  "tags": ["тег1", "тег2", "тег3"]
}

Теги — 2–5 коротких эмоциональных или визуальных дескриптора.`;

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

    console.log('Analyzing drawing with Jiva (Claude Sonnet 4.6 → Grok 4.20 fallback)...');

    const PRIMARY_MODEL = Deno.env.get("POLZA_CHAT_MODEL") || Deno.env.get("LLM_MODEL_PRIMARY") || "anthropic/claude-sonnet-4.6";
    const FALLBACK_MODEL = Deno.env.get("LLM_MODEL_FALLBACK") || "x-ai/grok-4.20";

    const buildBody = (model: string) => JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT + '\n\n' + languageInstruction },
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
    });

    const callModel = (model: string) => fetch(`${POLZA_API_BASE}/api/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${POLZA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: buildBody(model),
    });

    let response = await callModel(PRIMARY_MODEL);

    if (!response.ok && response.status !== 429 && response.status !== 402) {
      const errText = await response.text();
      console.warn(`[analyze-drawing] Primary model ${PRIMARY_MODEL} failed (${response.status}): ${errText}. Falling back to ${FALLBACK_MODEL}.`);
      response = await callModel(FALLBACK_MODEL);
    }

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
      console.error("Polza AI error:", response.status, errorText);
      throw new Error(`Polza AI error: ${response.status}`);
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
    let feedback = '';
    let tags: string[] = [];

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        feedback = parsed.feedback || content;
        tags = parsed.tags || [];
      } else {
        feedback = content;
        tags = ['analyzed'];
      }
    } catch {
      feedback = content;
      tags = ['analyzed'];
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
