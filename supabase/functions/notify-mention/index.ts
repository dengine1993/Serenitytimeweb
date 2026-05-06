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

    if (!messageContent || typeof messageContent !== "string") {
      return new Response(
        JSON.stringify({ error: "Message content is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Extract mentions: only ASCII usernames (letters, digits, underscore, dot)
    const mentionRegex = /@([a-zA-Z0-9_\.]+)/g;
    const mentions = new Set<string>();
    let match;
    while ((match = mentionRegex.exec(messageContent)) !== null) {
      mentions.add(match[1].toLowerCase());
    }

    if (mentions.size === 0) {
      return new Response(
        JSON.stringify({ success: true, notified: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const mentionsArr = Array.from(mentions);
    console.log("Found mentions:", mentionsArr);

    // Find users by username only (display_name may have spaces and isn't a stable handle)
    const { data: mentionedUsers, error: usersError } = await supabase
      .from("profiles")
      .select("user_id, display_name, username")
      .in("username", mentionsArr);

    if (usersError) {
      console.error("Error finding mentioned users:", usersError);
      return new Response(
        JSON.stringify({ error: "Failed to find mentioned users" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!mentionedUsers || mentionedUsers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, notified: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const usersToNotify = mentionedUsers.filter((u) => u.user_id !== senderId);

    if (usersToNotify.length === 0) {
      return new Response(
        JSON.stringify({ success: true, notified: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const preview =
      messageContent.length > 100 ? messageContent.slice(0, 100) + "..." : messageContent;

    // Create in-app notifications
    const notifications = usersToNotify.map((user) => ({
      user_id: user.user_id,
      actor_id: senderId,
      type: "mention",
      title: `${senderName} упомянул(а) вас`,
      message: preview,
      action_url: "/community",
      metadata: { source: "community" },
    }));

    const { error: notifError } = await supabase
      .from("notifications")
      .insert(notifications);

    if (notifError) {
      console.error("Error creating notifications:", notifError);
    }

    // Push notifications via unified push-dispatch
    const userIds = usersToNotify.map((u) => u.user_id);
    let pushSentCount = 0;
    try {
      const internalSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET") ?? "";
      const dispatchRes = await fetch(`${supabaseUrl}/functions/v1/push-dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-internal-secret": internalSecret },
        body: JSON.stringify({
          user_ids: userIds,
          type: "mention",
          title: `${senderName} упомянул(а) вас`,
          body: preview,
          url: "/community",
          tag: `mention:${senderId}`,
        }),
      });
      const dj = await dispatchRes.json().catch(() => ({}));
      pushSentCount = dj.sent ?? 0;
    } catch (e) {
      console.error("[notify-mention] dispatch error", e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        notified: usersToNotify.length,
        pushSent: pushSentCount,
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
