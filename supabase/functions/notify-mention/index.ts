import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MentionNotificationRequest {
  messageContent: string;
  senderName: string;
  senderId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { messageContent, senderName, senderId }: MentionNotificationRequest = await req.json();

    console.log("Processing mention notification:", { messageContent, senderName, senderId });

    if (!messageContent) {
      return new Response(
        JSON.stringify({ error: "Message content is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Extract mentions from message (@username pattern)
    const mentionRegex = /@(\S+)/g;
    const mentions: string[] = [];
    let match;
    
    while ((match = mentionRegex.exec(messageContent)) !== null) {
      mentions.push(match[1]);
    }

    if (mentions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, notified: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Found mentions:", mentions);

    // Find users by display_name, full_name, or username
    const { data: mentionedUsers, error: usersError } = await supabase
      .from("profiles")
      .select("user_id, display_name, full_name, username")
      .or(mentions.map(m => `display_name.ilike.${m},full_name.ilike.${m},username.ilike.${m}`).join(","));

    if (usersError) {
      console.error("Error finding mentioned users:", usersError);
      return new Response(
        JSON.stringify({ error: "Failed to find mentioned users" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Found mentioned users:", mentionedUsers);

    if (!mentionedUsers || mentionedUsers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, notified: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Filter out the sender from notifications
    const usersToNotify = mentionedUsers.filter(u => u.user_id !== senderId);

    // Get push subscriptions for mentioned users
    const userIds = usersToNotify.map(u => u.user_id);
    const { data: subscriptions, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", userIds);

    if (subsError) {
      console.error("Error fetching subscriptions:", subsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Found subscriptions:", subscriptions?.length || 0);

    // Create in-app notifications for mentioned users
    const notifications = usersToNotify.map(user => ({
      user_id: user.user_id,
      type: "mention",
      title: `${senderName} упомянул(а) вас`,
      message: messageContent.length > 100 ? messageContent.slice(0, 100) + "..." : messageContent,
    }));

    if (notifications.length > 0) {
      const { error: notifError } = await supabase
        .from("system_notifications")
        .insert(notifications);

      if (notifError) {
        console.error("Error creating notifications:", notifError);
      } else {
        console.log("Created in-app notifications:", notifications.length);
      }
    }

    // Send push notifications using VAPID
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    let pushSentCount = 0;

    if (subscriptions && subscriptions.length > 0 && vapidPublicKey && vapidPrivateKey) {
      console.log("Sending push to", subscriptions.length, "subscriptions");
      
      for (const sub of subscriptions) {
        try {
          // Create JWT for VAPID
          const header = { alg: "ES256", typ: "JWT" };
          const now = Math.floor(Date.now() / 1000);
          const payload = {
            aud: new URL(sub.endpoint).origin,
            exp: now + 12 * 60 * 60, // 12 hours
            sub: "mailto:support@jiva.app"
          };

          // Create push notification payload
          const pushPayload = JSON.stringify({
            title: `${senderName} упомянул(а) вас`,
            body: messageContent.length > 100 ? messageContent.slice(0, 100) + "..." : messageContent,
            icon: "/icon-192.png",
            badge: "/icon-192.png",
            data: { url: "/community" }
          });

          // Send push notification via fetch to push service
          const response = await fetch(sub.endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/octet-stream",
              "Content-Encoding": "aes128gcm",
              "TTL": "86400",
            },
            body: pushPayload
          });

          if (response.ok) {
            pushSentCount++;
            console.log("Push sent successfully to:", sub.endpoint.slice(0, 50));
          } else {
            console.error("Push failed:", response.status, await response.text());
          }
        } catch (pushError) {
          console.error("Error sending push to subscription:", pushError);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notified: usersToNotify.length,
        pushSent: pushSentCount
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error processing mention notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
