import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import webpush from "https://esm.sh/web-push@3.6.7?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WebPushRequest {
  subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
}

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:support@serenitylight.app";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  } catch (e) {
    console.error("Failed to set VAPID details:", e);
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { subscription, title, body, icon, badge, data }: WebPushRequest = await req.json();

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return new Response(
        JSON.stringify({ error: "Invalid subscription" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: "title and body are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: icon ?? "/icon-192.png",
      badge: badge ?? "/icon-192.png",
      data: data ?? {},
    });

    try {
      const result = await webpush.sendNotification(subscription, payload, {
        TTL: 60 * 60 * 24, // 24h
      });
      return new Response(
        JSON.stringify({ success: true, statusCode: result.statusCode }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } catch (err: any) {
      // 404/410 = subscription expired — caller may want to delete it
      const statusCode = err?.statusCode ?? 500;
      console.error("web-push error:", statusCode, err?.body ?? err?.message);
      return new Response(
        JSON.stringify({
          success: false,
          statusCode,
          expired: statusCode === 404 || statusCode === 410,
          error: err?.body ?? err?.message ?? "Push delivery failed",
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
  } catch (error: any) {
    console.error("Error in send-web-push:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
