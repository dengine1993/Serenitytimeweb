// Client-callable wrapper: lets an authenticated user trigger a personal-event push
// to a single recipient (DM / friend_request / reply_to_post).
// The caller's JWT identifies the actor; recipient is validated server-side and
// must NOT be the caller. Forwards to push-dispatch using the internal secret.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INTERNAL_SECRET = Deno.env.get("INTERNAL_FUNCTION_SECRET") ?? "";

type AllowedType = "dm" | "friend_request" | "reply_to_post";
const ALLOWED: AllowedType[] = ["dm", "friend_request", "reply_to_post"];

interface Body {
  type: AllowedType;
  recipient_id: string;
  preview?: string;     // short text snippet (for dm/comment)
  post_id?: string;     // for reply_to_post
  conversation_id?: string; // for dm
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = auth.slice(7);
    const sb = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: claims } = await sb.auth.getClaims(token);
    const callerId = claims?.claims?.sub as string | undefined;
    if (!callerId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = (await req.json()) as Body;
    if (!ALLOWED.includes(body.type) || !body.recipient_id) {
      return new Response(JSON.stringify({ error: "Bad payload" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (body.recipient_id === callerId) {
      return new Response(JSON.stringify({ skipped: "self" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get actor display name
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: actor } = await admin.from("profiles").select("display_name").eq("user_id", callerId).maybeSingle();
    const actorName = actor?.display_name?.trim() || "Кто-то";

    let title = "Восход";
    let pushBody = "";
    let url = "/app";
    let tag: string | undefined;

    if (body.type === "dm") {
      title = actorName;
      pushBody = (body.preview ?? "").slice(0, 140) || "Новое сообщение";
      url = body.conversation_id ? `/private/${body.conversation_id}` : "/app";
      tag = `dm:${callerId}`;
    } else if (body.type === "friend_request") {
      title = "Восход";
      pushBody = `${actorName} хочет добавить тебя в друзья`;
      url = "/friends";
      tag = `friend:${callerId}`;
    } else if (body.type === "reply_to_post") {
      title = "Восход";
      pushBody = `${actorName} ответил на твой Восход`;
      url = body.post_id ? `/post/${body.post_id}` : "/app";
      tag = body.post_id ? `post:${body.post_id}` : undefined;
    }

    const res = await fetch(`${SUPABASE_URL}/functions/v1/push-dispatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-secret": INTERNAL_SECRET },
      body: JSON.stringify({
        user_ids: [body.recipient_id],
        type: body.type,
        title, body: pushBody, url, tag,
      }),
    });
    const json = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(json), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[notify-event] error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
