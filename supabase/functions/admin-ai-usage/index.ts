import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  function jsonResp(payload: unknown) {
    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabase = createClient(supabaseUrl, serviceKey);

    const token = authHeader.replace("Bearer ", "").trim();
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) throw new Error("Unauthorized");
    const userId = claimsData.claims.sub as string;

    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!role) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const mode = (body.mode || "overview") as "overview" | "chat";
    const targetUserId = body.userId as string | undefined;

    if (mode === "chat") {
      if (!targetUserId) throw new Error("userId required");

      const { data, error } = await supabase
        .from("ai_messages")
        .select("id, content, role, created_at")
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      const merged = (data || []).reverse();
      return jsonResp({ chatHistory: merged });
    }

    // === Агрегаты по новой таблице ai_usage_log (с фоллбэком на llm_usage) ===
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: usage, error: usageError } = await supabase
      .from("ai_usage_log")
      .select("user_id, model, prompt_tokens, completion_tokens, total_tokens, is_premium, created_at")
      .order("created_at", { ascending: false })
      .limit(10000);
    if (usageError) throw usageError;

    let totalTokens = 0;
    let tokensToday = 0;
    let promptTotal = 0;
    let completionTotal = 0;
    let tokensFree = 0;
    let tokensPremium = 0;
    const usersSet = new Set<string>();
    const dailyMap: Record<string, { tokens: number; free: number; premium: number }> = {};
    const userTokens: Record<string, { tokens: number; count: number; isPremium: boolean }> = {};
    const modelMap: Record<string, { tokens: number; count: number }> = {};

    (usage || []).forEach((r) => {
      const t = r.total_tokens || 0;
      totalTokens += t;
      promptTotal += r.prompt_tokens || 0;
      completionTotal += r.completion_tokens || 0;
      const created = new Date(r.created_at);
      if (created >= today) tokensToday += t;
      if (r.is_premium) tokensPremium += t;
      else tokensFree += t;
      if (r.user_id) usersSet.add(r.user_id);

      if (created >= thirtyDaysAgo) {
        const dKey = created.toISOString().split("T")[0];
        if (!dailyMap[dKey]) dailyMap[dKey] = { tokens: 0, free: 0, premium: 0 };
        dailyMap[dKey].tokens += t;
        if (r.is_premium) dailyMap[dKey].premium += t;
        else dailyMap[dKey].free += t;
      }

      if (r.user_id) {
        if (!userTokens[r.user_id]) {
          userTokens[r.user_id] = { tokens: 0, count: 0, isPremium: !!r.is_premium };
        }
        userTokens[r.user_id].tokens += t;
        userTokens[r.user_id].count += 1;
        if (r.is_premium) userTokens[r.user_id].isPremium = true;
      }

      if (r.model) {
        if (!modelMap[r.model]) modelMap[r.model] = { tokens: 0, count: 0 };
        modelMap[r.model].tokens += t;
        modelMap[r.model].count += 1;
      }
    });

    const dailyUsage = Object.entries(dailyMap)
      .map(([date, v]) => ({
        date: new Date(date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }),
        sortKey: date,
        tokens: v.tokens,
        free: v.free,
        premium: v.premium,
      }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(({ sortKey, ...rest }) => rest);

    const sortedByTokens = Object.entries(userTokens)
      .sort((a, b) => b[1].tokens - a[1].tokens)
      .slice(0, 20);

    const idsForProfiles = new Set<string>(sortedByTokens.map(([id]) => id));
    const profileMap: Record<string, { display_name?: string; username?: string }> = {};
    if (idsForProfiles.size > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, username")
        .in("user_id", Array.from(idsForProfiles));
      (profiles || []).forEach((p) => {
        profileMap[p.user_id] = {
          display_name: p.display_name || undefined,
          username: p.username || undefined,
        };
      });
    }

    const abusers = sortedByTokens.map(([uid, v]) => ({
      user_id: uid,
      total_tokens: v.tokens,
      message_count: v.count,
      is_premium: v.isPremium,
      display_name: profileMap[uid]?.display_name,
      username: profileMap[uid]?.username,
    }));

    const models = Object.entries(modelMap)
      .map(([name, v]) => ({ model: name, tokens: v.tokens, requests: v.count }))
      .sort((a, b) => b.tokens - a.tokens);

    return jsonResp({
      stats: {
        totalTokens,
        tokensToday,
        promptTokens: promptTotal,
        completionTokens: completionTotal,
        tokensFree,
        tokensPremium,
        uniqueUsers: usersSet.size,
      },
      dailyUsage,
      abusers,
      models,
    });
  } catch (error) {
    console.error("admin-ai-usage error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 400;
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }
});
