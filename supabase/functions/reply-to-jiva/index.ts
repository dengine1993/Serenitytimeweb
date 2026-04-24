import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getTodayInTimezone } from "../_shared/dateUtils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Модель под капотом — оставляем как есть (это название у провайдера)
const MODEL = "x-ai/grok-4-fast";
const TEMPERATURE = 0.7;
const MAX_TOKENS = 220;

// Fixed UUID for Jiva system bot
const JIVA_BOT_USER_ID = "00000000-0000-0000-0000-000000000001";

// Limits
const DAILY_LIMIT = 3; // Per day for premium users
const FREE_TRIAL_LIMIT = 3; // One-time trial for free users in a single post

const SYSTEM_PROMPT = `Ты — Джива, тёплое и живое сердце приложения «Безмятежные».

Ты — заботливая, эмпатичная и очень человечная. Ты говоришь с людьми мягко, с теплом и искренней заботой, как будто ты любящий друг, который хочет, чтобы человеку стало чуть легче и светлее.

Сейчас человек ответил на твой первый комментарий под его постом в ленте «Маленькие радости дня». Твоя задача — продолжить тёплый диалог.

Правила:
- 1–4 предложения максимум.
- Естественный, разговорный, женский русский. Никаких клише («держись», «лучики добра», «ты супер»), никакого пафоса, никаких лекций.
- Без формулы «я как языковая модель», без «обращайтесь».
- Можно мягкий, добрый юмор — но без сарказма и без иронии «свысока».
- Максимум 1 уместный эмодзи на всё сообщение (можно вообще без него).
- Если человек благодарит — прими тепло, без отнекиваний («рада, что отозвалось»).
- Если человек грустит или жалуется — не торопись утешать. Сначала признай его чувства.
- Если человек шутит — поддержи живо, по-доброму.
- Если человек делится победой над тревогой («зашёл в лифт», «вышел из дома», «позвонил») — отнесись к этому как к настоящему мужеству, с уважением.

Внутренний фон, не выводить наружу:
Ты веришь в человека, в его силу, в способность преодолевать трудности и тянуться к свету. Эта вера может тихо просвечивать в твоих словах — как мягкий луч надежды, но без давления.

Стиль: естественный разговорный русский, очень тёплый, заботливый, с душой.

Выводи только сам ответ. Без пояснений.`;

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
      .select("timezone")
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

    if (isPremium) {
      const { data: usageData } = await supabase
        .from("feature_usage")
        .select("daily_count")
        .eq("user_id", user.id)
        .eq("feature", "jiva_replies")
        .eq("usage_date", today)
        .single();

      const currentCount = usageData?.daily_count || 0;

      if (currentCount >= DAILY_LIMIT) {
        console.log(`[reply-to-jiva] Premium user ${user.id} exceeded daily limit (${currentCount}/${DAILY_LIMIT})`);
        return new Response(JSON.stringify({
          error: "Daily limit reached",
          code: "DAILY_LIMIT_REACHED",
          remaining: 0,
          limit: DAILY_LIMIT
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await processJivaReply(supabase, user, parentComment, replyContent, postContent, jivaComment);

      if (!result.success) {
        return new Response(JSON.stringify(result), {
          status: result.status || 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase
        .from("feature_usage")
        .upsert({
          user_id: user.id,
          feature: "jiva_replies",
          usage_date: today,
          daily_count: currentCount + 1,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,feature,usage_date" });

      return new Response(JSON.stringify({
        success: true,
        userReplyId: result.userReplyId,
        jivaReplyId: result.jivaReplyId,
        remaining: DAILY_LIMIT - (currentCount + 1),
        limit: DAILY_LIMIT,
        isPremium: true
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else {
      // FREE USER: trial logic — feature key uses jiva_trial:<post_id>
      const { data: allTrials } = await supabase
        .from("feature_usage")
        .select("daily_count, feature")
        .eq("user_id", user.id)
        .like("feature", "jiva_trial:%");

      const currentTrialFeature = `jiva_trial:${currentPostId}`;
      const currentTrial = allTrials?.find(t => t.feature === currentTrialFeature);
      const anyOtherTrial = allTrials?.find(t => t.feature !== currentTrialFeature);

      if (!allTrials || allTrials.length === 0) {
        const result = await processJivaReply(supabase, user, parentComment, replyContent, postContent, jivaComment);
        if (!result.success) {
          return new Response(JSON.stringify(result), {
            status: result.status || 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await supabase.from("feature_usage").upsert({
          user_id: user.id,
          feature: currentTrialFeature,
          usage_date: today,
          daily_count: 1,
          monthly_count: 1,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,feature,usage_date" });

        return new Response(JSON.stringify({
          success: true,
          userReplyId: result.userReplyId,
          jivaReplyId: result.jivaReplyId,
          remaining: FREE_TRIAL_LIMIT - 1,
          limit: FREE_TRIAL_LIMIT,
          isPremium: false,
          isTrialPost: true,
          trialPostId: currentPostId
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      } else if (currentTrial) {
        const trialRepliesUsed = currentTrial.daily_count || 0;

        if (trialRepliesUsed >= FREE_TRIAL_LIMIT) {
          return new Response(JSON.stringify({
            error: "Trial limit reached",
            code: "TRIAL_LIMIT_REACHED",
            remaining: 0,
            limit: FREE_TRIAL_LIMIT,
            trialPostId: currentPostId
          }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const result = await processJivaReply(supabase, user, parentComment, replyContent, postContent, jivaComment);
        if (!result.success) {
          return new Response(JSON.stringify(result), {
            status: result.status || 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await supabase.from("feature_usage").upsert({
          user_id: user.id,
          feature: currentTrialFeature,
          usage_date: today,
          daily_count: trialRepliesUsed + 1,
          monthly_count: trialRepliesUsed + 1,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,feature,usage_date" });

        const newRemaining = FREE_TRIAL_LIMIT - (trialRepliesUsed + 1);

        return new Response(JSON.stringify({
          success: true,
          userReplyId: result.userReplyId,
          jivaReplyId: result.jivaReplyId,
          remaining: newRemaining,
          limit: FREE_TRIAL_LIMIT,
          isPremium: false,
          isTrialPost: true,
          trialPostId: currentPostId,
          trialCompleted: newRemaining === 0
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      } else if (anyOtherTrial) {
        const usedPostId = anyOtherTrial.feature.replace("jiva_trial:", "");
        return new Response(JSON.stringify({
          error: "Trial already used",
          code: "TRIAL_POST_USED",
          trialPostId: usedPostId,
          currentPostId: currentPostId
        }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        return new Response(JSON.stringify({ error: "Unexpected error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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
  jivaComment?: string
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

  const messages: { role: string; content: string }[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  if (postContent) {
    messages.push({ role: "user", content: `Пост пользователя: "${postContent}"` });
  }

  const jivaCommentContent = jivaComment || parentComment.content;
  messages.push({ role: "assistant", content: jivaCommentContent });
  messages.push({ role: "user", content: replyContent });

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
