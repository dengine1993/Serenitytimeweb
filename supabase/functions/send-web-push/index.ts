import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WebPushRequest {
  subscription: any; // PushSubscription object from browser
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subscription, title, body, icon, badge, data }: WebPushRequest = await req.json();

    if (!subscription || !title || !body) {
      return new Response(
        JSON.stringify({ error: "Subscription, title and body are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Web Push VAPID keys should be stored in environment
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("VAPID keys not configured");
      return new Response(
        JSON.stringify({ error: "Web Push not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // For now, we'll use the Web Push API directly
    // In production, you'd use a library like web-push
    const payload = JSON.stringify({
      title,
      body,
      icon: icon || "/icon-192.png",
      badge: badge || "/icon-192.png",
      data: data || {},
    });

    console.log("Web push payload:", payload);
    console.log("Subscription:", subscription);

    // Note: This is a placeholder. In production, use a proper Web Push library
    // For now, return success to enable frontend testing
    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Web Push notification queued (placeholder implementation)"
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error sending web push:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
