import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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
    const url = new URL(req.url);
    const type = (body.type || url.searchParams.get("type") || "admin") as
      | "admin" | "moderation" | "llm" | "consent";
    const limit = Math.min(Number(body.limit || url.searchParams.get("limit") || 50), 200);
    const beforeCreatedAt = body.before_created_at as string | undefined;
    const fromDate = body.from as string | undefined;
    const toDate = body.to as string | undefined;
    const adminFilter = body.admin_id as string | undefined;
    const actionFilter = body.action_filter as string | undefined;

    const enrichWithProfiles = async (rows: any[], idFields: string[]) => {
      const ids = new Set<string>();
      rows.forEach((r) => idFields.forEach((f) => r[f] && ids.add(r[f])));
      if (ids.size === 0) return {};
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, username")
        .in("user_id", Array.from(ids));
      const map: Record<string, string> = {};
      (profiles || []).forEach((p) => {
        map[p.user_id] = p.display_name || p.username || "Unknown";
      });
      return map;
    };

    const tableMap = {
      admin: "admin_logs",
      moderation: "moderation_history",
      llm: "llm_usage",
      consent: "consent_log",
    } as const;

    const table = tableMap[type];
    if (!table) throw new Error("Invalid type");

    let q = supabase.from(table).select("*").order("created_at", { ascending: false }).limit(limit);
    if (beforeCreatedAt) q = q.lt("created_at", beforeCreatedAt);
    if (fromDate) q = q.gte("created_at", fromDate);
    if (toDate) q = q.lte("created_at", toDate);
    if (type === "admin" && adminFilter) q = q.eq("admin_id", adminFilter);
    if (type === "admin" && actionFilter) q = q.ilike("action", `%${actionFilter.replace(/[%_]/g, "")}%`);

    const { data, error } = await q;
    if (error) throw error;

    const rows = data || [];
    const hasMore = rows.length === limit;
    const nextCursor = hasMore ? rows[rows.length - 1].created_at : null;

    if (type === "admin") {
      const map = await enrichWithProfiles(rows, ["admin_id"]);
      const enriched = rows.map((r) => ({ ...r, admin_name: map[r.admin_id] || "Unknown" }));
      return jsonResp({ logs: enriched, nextCursor, hasMore });
    }
    if (type === "moderation") {
      const map = await enrichWithProfiles(rows, ["moderator_id", "user_id"]);
      const enriched = rows.map((r) => ({
        ...r,
        moderator_name: map[r.moderator_id] || "Unknown",
        user_name: map[r.user_id] || "Unknown",
      }));
      return jsonResp({ logs: enriched, nextCursor, hasMore });
    }
    if (type === "consent") {
      const map = await enrichWithProfiles(rows, ["user_id"]);
      const enriched = rows.map((r) => ({ ...r, user_name: map[r.user_id] || "Unknown" }));
      return jsonResp({ logs: enriched, nextCursor, hasMore });
    }
    // llm
    return jsonResp({ logs: rows, nextCursor, hasMore });


  } catch (error) {
    console.error("admin-logs error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 400;
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }

  function jsonResp(payload: unknown) {
    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
