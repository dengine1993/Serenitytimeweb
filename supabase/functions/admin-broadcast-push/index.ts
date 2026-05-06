// Admin-initiated broadcast push.
// Resolves audience -> user_ids, writes audit row, calls push-dispatch in chunks.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const INTERNAL_SECRET = Deno.env.get("INTERNAL_FUNCTION_SECRET") ?? "";

interface BroadcastBody {
  title: string;
  body: string;
  url?: string;
  audience: "all" | "premium" | "free" | "user_ids" | "self";
  emails?: string[]; // when audience=user_ids: list of emails to look up
  urgent?: boolean;
  test_self?: boolean; // shortcut: send only to caller
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = auth.slice(7);
    const sb = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: claims } = await sb.auth.getClaims(token);
    const callerId = claims?.claims?.sub as string | undefined;
    if (!callerId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", callerId).eq("role", "admin").maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const payload = (await req.json()) as BroadcastBody;
    if (!payload.title?.trim() || !payload.body?.trim()) {
      return new Response(JSON.stringify({ error: "title and body are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (payload.title.length > 80 || payload.body.length > 240) {
      return new Response(JSON.stringify({ error: "title<=80, body<=240" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Resolve audience -> user_ids
    let userIds: string[] = [];
    if (payload.test_self || payload.audience === "self") {
      userIds = [callerId];
    } else if (payload.audience === "all") {
      const { data } = await admin.from("profiles").select("user_id").limit(100000);
      userIds = (data ?? []).map((r: any) => r.user_id);
    } else if (payload.audience === "premium") {
      const { data: subs } = await admin.from("subscriptions").select("user_id").eq("status", "active").eq("plan", "premium");
      const { data: manual } = await admin.from("profiles").select("user_id").gt("premium_until", new Date().toISOString());
      const set = new Set<string>();
      subs?.forEach((s: any) => set.add(s.user_id));
      manual?.forEach((p: any) => set.add(p.user_id));
      userIds = Array.from(set);
    } else if (payload.audience === "free") {
      const { data: all } = await admin.from("profiles").select("user_id").limit(100000);
      const allIds = (all ?? []).map((r: any) => r.user_id);
      const { data: premIds } = await admin.rpc("get_premium_user_ids", { user_ids: allIds });
      const premSet = new Set((premIds as string[] | null) ?? []);
      userIds = allIds.filter((id: string) => !premSet.has(id));
    } else if (payload.audience === "user_ids") {
      const emails = (payload.emails ?? []).map((e) => e.trim().toLowerCase()).filter(Boolean);
      if (emails.length === 0) {
        return new Response(JSON.stringify({ error: "emails required for user_ids audience" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      // Resolve emails via auth.admin.getUserByEmail (per email)
      const found: string[] = [];
      for (const email of emails) {
        try {
          const { data, error } = await (admin.auth.admin as any).getUserByEmail(email);
          if (!error && data?.user?.id) found.push(data.user.id);
        } catch (_) { /* ignore */ }
      }
      userIds = found;
    } else {
      return new Response(JSON.stringify({ error: "Invalid audience" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Insert audit row
    const { data: broadcast, error: insErr } = await admin
      .from("admin_broadcasts")
      .insert({
        created_by: callerId,
        title: payload.title.trim(),
        body: payload.body.trim(),
        url: payload.url || null,
        audience: payload.test_self ? "user_ids" : payload.audience,
        audience_user_ids: payload.test_self ? [callerId] : null,
        urgent: !!payload.urgent,
      })
      .select()
      .single();
    if (insErr) {
      console.error("[broadcast] insert error", insErr);
      return new Response(JSON.stringify({ error: insErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Dispatch in chunks of 500
    let totalSent = 0, totalFailed = 0;
    const CHUNK = 500;
    for (let i = 0; i < userIds.length; i += CHUNK) {
      const chunk = userIds.slice(i, i + CHUNK);
      const res = await fetch(`${SUPABASE_URL}/functions/v1/push-dispatch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": INTERNAL_SECRET,
        },
        body: JSON.stringify({
          user_ids: chunk,
          type: "admin_broadcast",
          title: payload.title.trim(),
          body: payload.body.trim(),
          url: payload.url || "/app",
          urgent: !!payload.urgent,
          tag: `broadcast:${broadcast.id}`,
        }),
      });
      const json = await res.json().catch(() => ({}));
      totalSent += json.sent ?? 0;
      totalFailed += json.failed ?? 0;
    }

    await admin.from("admin_broadcasts").update({ sent_count: totalSent, failed_count: totalFailed }).eq("id", broadcast.id);

    return new Response(JSON.stringify({ broadcast_id: broadcast.id, recipients: userIds.length, sent: totalSent, failed: totalFailed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[admin-broadcast-push] error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
