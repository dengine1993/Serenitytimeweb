// Unified push dispatcher: Web Push (VAPID) + Native (FCM HTTP v1).
// Server-to-server: requires INTERNAL_FUNCTION_SECRET in `x-internal-secret` header,
// OR called by an admin user (validated JWT).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const INTERNAL_SECRET = Deno.env.get("INTERNAL_FUNCTION_SECRET");
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY");
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:info@newdawnjourney.com";
const FCM_SA_JSON = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  try { webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE); }
  catch (e) { console.error("[push] vapid setup failed", e); }
}

type PushType = "dm" | "mention" | "reply_to_post" | "friend_request" | "admin_broadcast";

interface DispatchRequest {
  user_ids: string[];
  type: PushType;
  title: string;
  body: string;
  url?: string;
  tag?: string;
  urgent?: boolean;
  data?: Record<string, unknown>;
}

const PREF_FIELD: Record<PushType, string | null> = {
  dm: "push_private_messages",
  mention: "push_mentions",
  reply_to_post: "push_comments",
  friend_request: "push_friend_requests",
  admin_broadcast: "push_admin",
};

function isInQuietHours(now: Date, start?: string | null, end?: string | null, tz = "Europe/Moscow"): boolean {
  if (!start || !end) return false;
  // Get HH:MM in user's timezone
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false });
  const cur = fmt.format(now); // "HH:MM"
  const s = start.slice(0, 5);
  const e = end.slice(0, 5);
  if (s === e) return false;
  return s < e ? (cur >= s && cur < e) : (cur >= s || cur < e);
}

// --- FCM HTTP v1 token cache ---
let fcmTokenCache: { token: string; exp: number; projectId: string } | null = null;

async function getFcmAccessToken(): Promise<{ token: string; projectId: string } | null> {
  if (!FCM_SA_JSON) return null;
  if (fcmTokenCache && fcmTokenCache.exp > Date.now() + 60_000) {
    return { token: fcmTokenCache.token, projectId: fcmTokenCache.projectId };
  }
  try {
    const sa = JSON.parse(FCM_SA_JSON);
    const iat = Math.floor(Date.now() / 1000);
    const claim = {
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat,
      exp: iat + 3600,
    };
    const enc = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
    const header = enc({ alg: "RS256", typ: "JWT" });
    const payload = enc(claim);
    const toSign = `${header}.${payload}`;

    // Import private key
    const pem = sa.private_key.replace(/-----BEGIN PRIVATE KEY-----/, "").replace(/-----END PRIVATE KEY-----/, "").replace(/\s+/g, "");
    const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
    const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
    const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(toSign)));
    const sigB64 = btoa(String.fromCharCode(...sig)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
    const jwt = `${toSign}.${sigB64}`;

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });
    const json = await res.json();
    if (!json.access_token) {
      console.error("[push] FCM token error", json);
      return null;
    }
    fcmTokenCache = { token: json.access_token, exp: Date.now() + (json.expires_in - 60) * 1000, projectId: sa.project_id };
    return { token: json.access_token, projectId: sa.project_id };
  } catch (e) {
    console.error("[push] FCM SA parse/sign failed", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    // Auth: internal secret OR admin JWT
    const internalSecret = req.headers.get("x-internal-secret");
    const isInternal = INTERNAL_SECRET && internalSecret === INTERNAL_SECRET;
    let isAdminCaller = false;

    if (!isInternal) {
      const auth = req.headers.get("Authorization");
      if (!auth?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const token = auth.slice(7);
      const sb = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
      const { data: claims } = await sb.auth.getClaims(token);
      if (!claims?.claims?.sub) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const admin = createClient(SUPABASE_URL, SERVICE_KEY);
      const { data: roleData } = await admin.from("user_roles").select("role").eq("user_id", claims.claims.sub).eq("role", "admin").maybeSingle();
      isAdminCaller = !!roleData;
      if (!isAdminCaller) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const body = (await req.json()) as DispatchRequest;
    if (!Array.isArray(body.user_ids) || body.user_ids.length === 0 || !body.title || !body.body || !body.type) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Load preferences
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("user_id, push_private_messages, push_mentions, push_comments, push_friend_requests, push_reactions, push_admin, quiet_hours_enabled, quiet_hours_start, quiet_hours_end")
      .in("user_id", body.user_ids);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, timezone")
      .in("user_id", body.user_ids);
    const tzMap = new Map<string, string>();
    profiles?.forEach((p: any) => tzMap.set(p.user_id, p.timezone || "Europe/Moscow"));

    const prefMap = new Map<string, any>();
    prefs?.forEach((p: any) => prefMap.set(p.user_id, p));

    const prefField = PREF_FIELD[body.type];
    const now = new Date();
    const allowed = body.user_ids.filter((uid) => {
      const p = prefMap.get(uid);
      if (p && prefField && p[prefField] === false) return false;
      if (!body.urgent && p?.quiet_hours_enabled && isInQuietHours(now, p.quiet_hours_start, p.quiet_hours_end, tzMap.get(uid))) return false;
      return true;
    });

    if (allowed.length === 0) {
      return new Response(JSON.stringify({ sent: 0, failed: 0, skipped: body.user_ids.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Load endpoints
    const [{ data: webSubs }, { data: nativeTokens }] = await Promise.all([
      supabase.from("push_subscriptions").select("user_id, endpoint, p256dh, auth").in("user_id", allowed),
      supabase.from("device_push_tokens").select("user_id, token, platform").in("user_id", allowed),
    ]);

    let sent = 0, failed = 0;
    const expiredWebEndpoints: string[] = [];
    const expiredNativeTokens: string[] = [];

    // --- Web Push ---
    if (VAPID_PUBLIC && VAPID_PRIVATE && webSubs?.length) {
      const payload = JSON.stringify({
        title: body.title,
        body: body.body,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data: { url: body.url ?? "/app", tag: body.tag, type: body.type, ...(body.data ?? {}) },
      });
      await Promise.all(webSubs.map(async (s: any) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
            { TTL: 86400 }
          );
          sent++;
        } catch (e: any) {
          failed++;
          const code = e?.statusCode;
          if (code === 404 || code === 410) expiredWebEndpoints.push(s.endpoint);
          else console.error("[push] web error", code, e?.body ?? e?.message);
        }
      }));
    }

    // --- Native (FCM HTTP v1) ---
    if (FCM_SA_JSON && nativeTokens?.length) {
      const fcm = await getFcmAccessToken();
      if (fcm) {
        await Promise.all(nativeTokens.map(async (t: any) => {
          try {
            const message = {
              message: {
                token: t.token,
                notification: { title: body.title, body: body.body },
                data: { url: body.url ?? "/app", type: body.type, ...(body.data ? Object.fromEntries(Object.entries(body.data).map(([k, v]) => [k, String(v)])) : {}) },
                android: { priority: body.urgent ? "HIGH" : "NORMAL", collapse_key: body.tag },
                apns: { headers: { "apns-priority": body.urgent ? "10" : "5", ...(body.tag ? { "apns-collapse-id": body.tag } : {}) } },
              },
            };
            const res = await fetch(`https://fcm.googleapis.com/v1/projects/${fcm.projectId}/messages:send`, {
              method: "POST",
              headers: { Authorization: `Bearer ${fcm.token}`, "Content-Type": "application/json" },
              body: JSON.stringify(message),
            });
            if (res.ok) {
              sent++;
            } else {
              failed++;
              const errJson = await res.json().catch(() => ({}));
              const status = errJson?.error?.status;
              if (status === "NOT_FOUND" || status === "UNREGISTERED" || res.status === 404) {
                expiredNativeTokens.push(t.token);
              } else {
                console.error("[push] FCM error", res.status, errJson);
              }
            }
          } catch (e) {
            failed++;
            console.error("[push] FCM exception", e);
          }
        }));
      } else {
        console.warn("[push] FCM SA configured but token fetch failed");
      }
    }

    // Cleanup expired
    if (expiredWebEndpoints.length) {
      await supabase.from("push_subscriptions").delete().in("endpoint", expiredWebEndpoints);
    }
    if (expiredNativeTokens.length) {
      await supabase.from("device_push_tokens").delete().in("token", expiredNativeTokens);
    }

    return new Response(JSON.stringify({
      sent, failed,
      skipped: body.user_ids.length - allowed.length,
      cleaned: expiredWebEndpoints.length + expiredNativeTokens.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[push-dispatch] error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
