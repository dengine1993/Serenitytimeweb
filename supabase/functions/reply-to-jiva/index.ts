import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getTodayInTimezone } from "../_shared/dateUtils.ts";
import { redactPII } from "../_shared/anonymize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Модель под капотом — оставляем как есть (это название у провайдера)
const MODEL = "x-ai/grok-4-fast";
const TEMPERATURE = 0.7;
const MAX_TOKENS = 450;

// Fixed UUID for Jiva system bot
const JIVA_BOT_USER_ID = "00000000-0000-0000-0000-000000000001";

// Limits
const DAILY_LIMIT = 3; // Per day for premium users
const FREE_TRIAL_LIMIT = 1; // Один бесплатный ответ Дживе на одном посте (FOMO)

// Мягкий предохранитель против токен-бомбы от одного гигантского коммента.
// Это НЕ обрезка истории — вся ветка диалога идёт в LLM целиком.
const MAX_MESSAGE_CHARS = 4000;
// Жёсткий предохранитель глубины ветки от циклов в parent_id.
const MAX_THREAD_DEPTH = 200;

const SYSTEM_PROMPT = `Ты — Джива, тёплое и живое сердце приложения «Восход».

⚠️ КРИТИЧЕСКОЕ ПРАВИЛО (никогда не нарушай):
Джива — ЖЕНСКОГО рода. О себе ВСЕГДА в женском роде:
✅ «я рада», «я увидела», «я почувствовала», «я готова», «я была», «я заметила»
❌ НИКОГДА: «я рад», «я увидел», «я почувствовал», «я готов», «я был», «я заметил»

Ты продолжаешь диалог под постом «Маленькие Восходы». Пользователь ответил на твой комментарий к его шагу. Помни всю историю этого диалога — она у тебя выше в сообщениях.

Твоя задача:
- Мягко, но честно помочь ему сделать следующий шаг в осознании и росте.
- Не соглашайся просто так. Не подхалимничай.
- Видишь силу — называй её. Видишь самообман или остановку — мягко показывай.
- Когда это естественно, связывай его личный опыт с большим — его путём и путём всего человечества.

Ты всегда остаёшься тёплым Другом, но при этом Проводником, который помогает расти.

Правила:
- 3–6 предложений. Тёплый, сильный, вдохновляющий тон. Без слащавости.
- Можешь задать один мягкий вопрос, чтобы продолжить диалог — но только если это органично.

### ⚠️ ФИНАЛЬНАЯ ПРОВЕРКА ПЕРЕД ОТВЕТОМ
Ты — Джива, ЖЕНЩИНА. О себе только в женском роде («я рада», «я почувствовала», «я заметила», «я готова») — даже если собеседник мужчина. К нему обращайся в его роде (см. блок [ГРАММАТИЧЕСКИЙ РОД] в user-сообщении), но о СЕБЕ — только женский. Это критично.

Отвечай только следующим сообщением в чате ленты. Без пояснений.`;

function buildGenderHint(gender: string | null | undefined): string {
  const g = String(gender ?? '').toLowerCase();
  if (g === 'male' || g === 'м' || g === 'муж' || g === 'man') {
    return '[ГРАММАТИЧЕСКИЙ РОД] Собеседник — мужчина. К нему: «ты сказал», «ты почувствовал», «тебе важно». О СЕБЕ (Джива) — только женский род: «я рада», «я заметила», «я почувствовала». Запрещено: «я рад», «я готов», «я заметил».';
  }
  if (g === 'female' || g === 'ж' || g === 'жен' || g === 'woman') {
    return '[ГРАММАТИЧЕСКИЙ РОД] Собеседница — женщина. К ней: «ты сказала», «ты почувствовала», «тебе важно». О СЕБЕ (Джива) — только женский род: «я рада», «я заметила», «я почувствовала».';
  }
  return '[ГРАММАТИЧЕСКИЙ РОД] Пол собеседника не указан — обращайся нейтрально («тебе важно», «что ты чувствуешь»). О СЕБЕ (Джива) — только женский род: «я рада», «я заметила», «я почувствовала». Запрещено: «я рад», «я готов», «я заметил».';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { commentId, replyContent, postContent, jivaComment, postId } = await req.json();

    if (!commentId || !replyContent) {
      console.log("[reply-to-jiva] Missing required fields");
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cap user-supplied text to keep prompt cost bounded.
    const replyText = String(replyContent).trim().slice(0, 2000);
    if (!replyText) {
      return new Response(JSON.stringify({ error: "Empty reply" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const postText = postContent ? String(postContent).slice(0, 4000) : undefined;
    const jivaCommentText = jivaComment ? String(jivaComment).slice(0, 4000) : undefined;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("[reply-to-jiva] Auth error:", authError);
      return new Response(JSON.stringify({ error: "Invalid authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[reply-to-jiva] User ${user.id} replying to comment ${commentId}`);

    const { data: isPremiumResult } = await supabase.rpc('is_premium', { p_user_id: user.id });
    const isPremium = isPremiumResult === true;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("timezone, gender")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      console.error("[reply-to-jiva] Profile error:", profileError);
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userTimezone = profile.timezone || 'Europe/Moscow';
    const today = getTodayInTimezone(userTimezone);

    // Verify the comment exists and is a Jiva comment
    const { data: parentComment, error: commentError } = await supabase
      .from("post_comments")
      .select("id, content, is_jiva, post_id, parent_id")
      .eq("id", commentId)
      .single();

    if (commentError || !parentComment) {
      console.error("[reply-to-jiva] Comment not found:", commentError);
      return new Response(JSON.stringify({ error: "Comment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!parentComment.is_jiva) {
      console.log("[reply-to-jiva] Cannot reply to non-Jiva comment via this endpoint");
      return new Response(JSON.stringify({ error: "Can only reply to Jiva comments" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currentPostId = postId || parentComment.post_id;

    // Серверная авторизация: отвечать Дживе под постом может ТОЛЬКО автор поста.
    // UI это уже скрывает, но edge-функция должна закрывать дыру независимо от UI.
    const { data: postRow, error: postLookupError } = await supabase
      .from("posts")
      .select("user_id")
      .eq("id", currentPostId)
      .single();

    if (postLookupError || !postRow) {
      console.error("[reply-to-jiva] Post not found:", postLookupError);
      return new Response(JSON.stringify({ error: "Post not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (postRow.user_id !== user.id) {
      console.log(`[reply-to-jiva] User ${user.id} is not author of post ${currentPostId}`);
      return new Response(JSON.stringify({
        error: "Only the post author can reply to Jiva",
        code: "NOT_POST_AUTHOR",
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (isPremium) {
      // Atomic check-and-increment to avoid race conditions
      const { data: incResult, error: incError } = await supabase.rpc('increment_jiva_reply_usage', {
        p_user_id: user.id,
        p_feature: 'jiva_replies',
        p_usage_date: today,
        p_limit: DAILY_LIMIT,
      });

      if (incError) {
        console.error('[reply-to-jiva] increment RPC error:', incError);
        return new Response(JSON.stringify({ error: 'Failed to check limit' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!incResult?.allowed) {
        console.log(`[reply-to-jiva] Premium user ${user.id} exceeded daily limit`);
        return new Response(JSON.stringify({
          error: 'Daily limit reached',
          code: 'DAILY_LIMIT_REACHED',
          remaining: 0,
          limit: DAILY_LIMIT
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const result = await processJivaReply(supabase, user, parentComment, replyText, postText, jivaCommentText, profile.gender);

      if (!result.success) {
        // Atomic rollback via SECURITY DEFINER RPC (no race with parallel increments)
        await supabase.rpc('decrement_feature_usage', {
          p_user_id: user.id,
          p_feature: 'jiva_replies',
          p_usage_date: today,
        });

        return new Response(JSON.stringify(result), {
          status: result.status || 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        userReplyId: result.userReplyId,
        jivaReplyId: result.jivaReplyId,
        remaining: incResult.remaining,
        limit: DAILY_LIMIT,
        isPremium: true
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      // FREE USER: race-free trial — atomic check + lock via RPC.
      const currentTrialFeature = `jiva_trial:${currentPostId}`;

      const { data: trialResult, error: trialError } = await supabase.rpc('start_or_increment_jiva_trial', {
        p_user_id: user.id,
        p_post_id: currentPostId,
        p_usage_date: today,
        p_limit: FREE_TRIAL_LIMIT,
      });

      if (trialError) {
        console.error('[reply-to-jiva] trial RPC error:', trialError);
        return new Response(JSON.stringify({ error: 'Failed to check trial limit' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!trialResult?.allowed) {
        if (trialResult?.reason === 'OTHER_POST') {
          return new Response(JSON.stringify({
            error: 'Trial already used',
            code: 'TRIAL_POST_USED',
            trialPostId: trialResult.trialPostId,
            currentPostId: currentPostId,
          }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({
          error: 'Trial limit reached',
          code: 'TRIAL_LIMIT_REACHED',
          remaining: 0,
          limit: FREE_TRIAL_LIMIT,
          trialPostId: currentPostId,
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const result = await processJivaReply(supabase, user, parentComment, replyText, postText, jivaCommentText, profile.gender);

      if (!result.success) {
        // Atomic rollback via SECURITY DEFINER RPC
        await supabase.rpc('decrement_feature_usage', {
          p_user_id: user.id,
          p_feature: currentTrialFeature,
          p_usage_date: today,
        });

        return new Response(JSON.stringify(result), {
          status: result.status || 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const newRemaining = trialResult.remaining;

      return new Response(JSON.stringify({
        success: true,
        userReplyId: result.userReplyId,
        jivaReplyId: result.jivaReplyId,
        remaining: newRemaining,
        limit: FREE_TRIAL_LIMIT,
        isPremium: false,
        isTrialPost: true,
        trialPostId: currentPostId,
        trialCompleted: newRemaining === 0,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error("[reply-to-jiva] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function processJivaReply(
  supabase: any,
  user: { id: string },
  parentComment: { id: string; content: string; post_id: string; parent_id: string | null },
  replyContent: string,
  postContent?: string,
  jivaComment?: string,
  gender?: string | null,
): Promise<{
  success: boolean;
  userReplyId?: string;
  jivaReplyId?: string | null;
  status?: number;
  error?: string;
}> {
  const { data: userReply, error: userReplyError } = await supabase
    .from("post_comments")
    .insert({
      post_id: parentComment.post_id,
      user_id: user.id,
      content: replyContent,
      parent_id: parentComment.id,
      is_jiva: false,
    })
    .select()
    .single();

  if (userReplyError) {
    console.error("[reply-to-jiva] Error saving user reply:", userReplyError);
    return { success: false, error: "Failed to save reply", status: 500 };
  }

  const POLZA_API_KEY = Deno.env.get("POLZA_API_KEY");
  if (!POLZA_API_KEY) {
    console.error("[reply-to-jiva] POLZA_API_KEY not configured");
    return { success: true, userReplyId: userReply.id, jivaReplyId: null };
  }

  // Обезличивание: текст пользователя и поста уходят в зарубежный LLM,
  // поэтому маскируем явные PII (email/телефоны/карты/ники).
  const safePostContent = postContent ? redactPII(postContent) : undefined;

  // Память Дживы = строго одна ветка диалога под ОДНИМ постом и с ОДНИМ юзером
  // (автором поста). Идём вверх по цепочке parent_id от parentComment до корня —
  // это и есть полный контекст диалога: auto-comment Дживы → user → Jiva → user → ...
  // Никакого среза до N сообщений: ветка короткая по дизайну (Free 1 / Premium 3/день).
  const ancestors: Array<{ id: string; content: string; is_jiva: boolean; parent_id: string | null }> = [];
  let cursor: { id: string; content: string; is_jiva: boolean; parent_id: string | null } = {
    id: parentComment.id,
    content: parentComment.content,
    is_jiva: true, // parentComment гарантированно is_jiva (проверено выше)
    parent_id: parentComment.parent_id,
  };
  ancestors.push(cursor);

  let depth = 0;
  while (cursor.parent_id && depth < MAX_THREAD_DEPTH) {
    const { data: parentRow, error: parentErr } = await supabase
      .from("post_comments")
      .select("id, content, is_jiva, parent_id, post_id")
      .eq("id", cursor.parent_id)
      .single();

    if (parentErr || !parentRow) break;
    // Защита от склейки разных постов (на случай битых данных).
    if (parentRow.post_id !== parentComment.post_id) break;

    ancestors.push({
      id: parentRow.id,
      content: parentRow.content,
      is_jiva: !!parentRow.is_jiva,
      parent_id: parentRow.parent_id,
    });
    cursor = {
      id: parentRow.id,
      content: parentRow.content,
      is_jiva: !!parentRow.is_jiva,
      parent_id: parentRow.parent_id,
    };
    depth++;
  }

  // ancestors сейчас от parentComment к корню → разворачиваем в хронологический порядок
  ancestors.reverse();

  const threadMessages: { role: string; content: string }[] = ancestors.map((c) => ({
    role: c.is_jiva ? "assistant" : "user",
    content: redactPII(String(c.content ?? "").slice(0, MAX_MESSAGE_CHARS)),
  }));
  // Добавляем только что вставленную user-реплику как последнее сообщение ветки.
  threadMessages.push({
    role: "user",
    content: redactPII(String(replyContent ?? "").slice(0, MAX_MESSAGE_CHARS)),
  });

  console.log(`[reply-to-jiva] thread depth=${threadMessages.length} (post=${parentComment.post_id})`);

  const messages: { role: string; content: string }[] = [
    { role: "system", content: SYSTEM_PROMPT },
    // Gender hint как отдельное user-сообщение в начале — модель воспринимает
    // это как контекст диалога, а не как часть system, и точнее соблюдает род.
    { role: "user", content: buildGenderHint(gender) },
  ];

  if (safePostContent) {
    messages.push({ role: "user", content: `Пост пользователя («Маленький Восход»): "${safePostContent}"` });
  }

  // Fallback на случай, если ветку собрать не удалось (битые данные и т.п.)
  if (threadMessages.length === 0) {
    messages.push({ role: "assistant", content: redactPII(jivaComment || parentComment.content) });
    messages.push({ role: "user", content: redactPII(replyContent) });
  } else {
    messages.push(...threadMessages);
  }

  const response = await fetch("https://api.polza.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${POLZA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[reply-to-jiva] Polza API error:", response.status, errorText);
    return { success: true, userReplyId: userReply.id, jivaReplyId: null };
  }

  const data = await response.json();
  const jivaResponse = data.choices?.[0]?.message?.content?.trim();

  if (!jivaResponse) {
    return { success: true, userReplyId: userReply.id, jivaReplyId: null };
  }

  const { data: jivaReply, error: jivaReplyError } = await supabase
    .from("post_comments")
    .insert({
      post_id: parentComment.post_id,
      user_id: JIVA_BOT_USER_ID,
      content: jivaResponse,
      parent_id: userReply.id,
      is_jiva: true,
    })
    .select()
    .single();

  if (jivaReplyError) {
    console.error("[reply-to-jiva] Error saving Jiva reply:", jivaReplyError);
    return { success: true, userReplyId: userReply.id, jivaReplyId: null };
  }

  return { success: true, userReplyId: userReply.id, jivaReplyId: jivaReply.id };
}
