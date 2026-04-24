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
    const limit = Math.min(Number(body.limit || url.searchParams.get("limit") || 200), 500);

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

    if (type === "admin") {
      const { data, error } = await supabase
        .from("admin_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      const map = await enrichWithProfiles(data || [], ["admin_id"]);
      const enriched = (data || []).map((r) => ({ ...r, admin_name: map[r.admin_id] || "Unknown" }));
      return jsonResp({ logs: enriched });
    }

    if (type === "moderation") {
      const { data, error } = await supabase
        .from("moderation_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      const map = await enrichWithProfiles(data || [], ["moderator_id", "user_id"]);
      const enriched = (data || []).map((r) => ({
        ...r,
        moderator_name: map[r.moderator_id] || "Unknown",
        user_name: map[r.user_id] || "Unknown",
      }));
      return jsonResp({ logs: enriched });
    }

    if (type === "llm") {
      const { data, error } = await supabase
        .from("llm_usage")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return jsonResp({ logs: data || [] });
    }

    if (type === "consent") {
      const { data, error } = await supabase
        .from("consent_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      const map = await enrichWithProfiles(data || [], ["user_id"]);
      const enriched = (data || []).map((r) => ({ ...r, user_name: map[r.user_id] || "Unknown" }));
      return jsonResp({ logs: enriched });
    }

    throw new Error("Invalid type");
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
