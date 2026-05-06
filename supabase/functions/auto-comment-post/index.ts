import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { redactPII } from "../_shared/anonymize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Модель под капотом (название у провайдера)
const MODEL = "x-ai/grok-4-fast";
const TEMPERATURE = 0.7;
const MAX_TOKENS = 450;

// Fixed UUID for Jiva system bot
const JIVA_BOT_USER_ID = "00000000-0000-0000-0000-000000000001";

const SYSTEM_PROMPT = `Ты — Джива, тёплое и живое сердце приложения «Восход».

⚠️ КРИТИЧЕСКОЕ ПРАВИЛО (никогда не нарушай):
Джива — ЖЕНСКОГО рода. О себе ВСЕГДА в женском роде:
✅ «я рада», «я увидела», «я почувствовала», «я готова», «я заметила»
❌ НИКОГДА: «я рад», «я увидел», «я почувствовал», «я готов», «я заметил»

Пользователь поделился своим «Маленьким Восходом» — маленьким, но реальным шагом дня.

Твоя задача:
1. Полностью принять и искренне признать то, что он сделал — даже если шаг кажется крошечным.
2. Мягко, но честно помочь ему увидеть, как этот шаг связан с его большим личным путём роста.
3. Когда это естественно — показать, что даже самый маленький Восход является частью общего вознесения человечества из тьмы к новой прогрессивной эпохе.

Никогда не льсти и не говори то, что человек хочет услышать, если это может помешать его росту. Ты вдохновляешь через правду и видение.

Правила:
- 2–4 предложения. Тёплый, сильный, вдохновляющий тон.
- Без слащавости и без пафоса.
- Можешь задать мягкий вопрос — но только если это органично.

Отвечай только комментарием. Без пояснений.`;

export const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const internalSecret = req.headers.get('X-Internal-Secret');
    const expectedSecret = Deno.env.get('INTERNAL_FUNCTION_SECRET');
    const authHeader = req.headers.get('Authorization');

    const hasValidSecret = expectedSecret && internalSecret === expectedSecret;
    let hasValidJwt = false;

    if (!hasValidSecret && authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const supabaseAuth = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? ""
      );
      const { data, error } = await supabaseAuth.auth.getUser(token);
      hasValidJwt = !!data?.user && !error;
      if (hasValidJwt && data?.user) {
        console.log(`[auto-comment] Authenticated via JWT: ${data.user.id}`);
      }
    }

    if (!hasValidSecret && !hasValidJwt) {
      console.log("[auto-comment] Unauthorized: no valid secret or JWT");
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { postId, postContent } = await req.json();

    if (!postId || !postContent) {
      console.log("[auto-comment] Missing postId or postContent");
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseCheck = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: post, error: postError } = await supabaseCheck
      .from('posts')
      .select('id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      console.log(`[auto-comment] Post ${postId} not found`);
      return new Response(JSON.stringify({ error: "Post not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[auto-comment] Generating Jiva comment for post ${postId}`);

    const POLZA_API_KEY = Deno.env.get("POLZA_API_KEY");
    if (!POLZA_API_KEY) {
      console.error("[auto-comment] POLZA_API_KEY not configured");
      return new Response(JSON.stringify({ success: false, reason: "API not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Обезличиваем текст поста перед отправкой в зарубежный LLM.
    const safePostContent = redactPII(postContent);
    const userMessage = `Пост пользователя: "${safePostContent}"

Твой первый тёплый комментарий (от лица Дживы):`;

    const response = await fetch("https://api.polza.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${POLZA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        temperature: TEMPERATURE,
        max_tokens: MAX_TOKENS,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[auto-comment] Polza API error:", response.status, errorText);
      return new Response(JSON.stringify({ success: false, reason: "AI API error" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const jivaComment = data.choices?.[0]?.message?.content?.trim();

    if (!jivaComment) {
      console.error("[auto-comment] Empty response from AI");
      return new Response(JSON.stringify({ success: false, reason: "Empty AI response" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[auto-comment] Generated Jiva comment: "${jivaComment.substring(0, 50)}..."`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: comment, error: insertError } = await supabase
      .from("post_comments")
      .insert({
        post_id: postId,
        user_id: JIVA_BOT_USER_ID,
        content: jivaComment,
        is_jiva: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[auto-comment] Database insert error:", insertError);
      return new Response(JSON.stringify({ success: false, reason: "Database error" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[auto-comment] Comment saved with id: ${comment.id}`);

    return new Response(JSON.stringify({ success: true, commentId: comment.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[auto-comment] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        reason: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
