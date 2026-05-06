import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendMail } from "../_shared/smtp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendEmail(to: string, subject: string, html: string) {
  const result = await sendMail({ to, subject, html });
  if (!result.ok) {
    throw new Error(`Email send failed: ${result.error}`);
  }
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find subscriptions expiring in exactly 3 days
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const threeDaysStart = new Date(threeDaysFromNow);
    threeDaysStart.setHours(0, 0, 0, 0);
    const threeDaysEnd = new Date(threeDaysFromNow);
    threeDaysEnd.setHours(23, 59, 59, 999);

    console.log(`Checking for subscriptions expiring between ${threeDaysStart.toISOString()} and ${threeDaysEnd.toISOString()}`);

    // Get active subscriptions expiring in 3 days
    const { data: expiringSubscriptions, error: subsError } = await supabaseAdmin
      .from("subscriptions")
      .select("id, user_id, plan, current_period_end, auto_renew, billing_interval, yookassa_payment_method_id, canceled_at")
      .eq("status", "active")
      .gte("current_period_end", threeDaysStart.toISOString())
      .lte("current_period_end", threeDaysEnd.toISOString());

    if (subsError) {
      console.error("Error fetching subscriptions:", subsError);
      throw subsError;
    }

    console.log(`Found ${expiringSubscriptions?.length || 0} subscriptions expiring in 3 days`);

    if (!expiringSubscriptions || expiringSubscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No expiring subscriptions found", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = [];

    for (const sub of expiringSubscriptions) {
      try {
        // Get user email and profile
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(sub.user_id);
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("display_name, full_name")
          .eq("user_id", sub.user_id)
          .maybeSingle();

        const userEmail = authUser?.user?.email;
        const userName = profile?.display_name || profile?.full_name || "Друг";
        const expiryDate = new Date(sub.current_period_end);
        const formattedDate = expiryDate.toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "long",
          year: "numeric"
        });

        // Check if we already sent a notification for this period
        const { data: existingNotification } = await supabaseAdmin
          .from("notifications")
          .select("id")
          .eq("user_id", sub.user_id)
          .eq("type", "subscription_expiry_reminder")
          .gte("created_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
          .maybeSingle();

        if (existingNotification) {
          console.log(`Already sent reminder to user ${sub.user_id} in last 24h, skipping`);
          continue;
        }

        // Текст зависит от того, есть ли у нас сохранённый payment_method
        // и включено ли автопродление.
        const willAutoRenew = sub.auto_renew && sub.yookassa_payment_method_id && !sub.canceled_at;
        const notificationMessage = willAutoRenew
          ? `Ваша подписка «Опора» автоматически продлится ${formattedDate}. Если хотите отменить — сделайте это в разделе Premium до этой даты.`
          : `Ваша подписка «Опора» заканчивается ${formattedDate}. Продлите её, чтобы сохранить доступ ко всем возможностям.`;

        await supabaseAdmin.from("notifications").insert({
          user_id: sub.user_id,
          type: "subscription_expiry_reminder",
          title: "Подписка скоро закончится",
          message: notificationMessage
        });

        // Send email if user has email
        if (userEmail) {
          const emailSubject = "Ваша подписка «Опора» скоро заканчивается";

          const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .logo { font-size: 24px; font-weight: bold; color: #6366f1; }
                .content { background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 20px; }
                .highlight { color: #6366f1; font-weight: 600; }
                .cta { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px; }
                .footer { text-align: center; color: #94a3b8; font-size: 14px; margin-top: 30px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="logo">🌿 Восход</div>
                </div>
                <div class="content">
                  <p>Привет, ${userName}! 👋</p>
                  <p>Напоминаем, что ваша подписка <span class="highlight">«Опора»</span> заканчивается <strong>${formattedDate}</strong>.</p>
                  <p>Чтобы продолжить пользоваться всеми возможностями:</p>
                  <ul>
                    <li>🧠 Глубокие разборы с Jiva</li>
                    <li>🧩 Память о ваших переживаниях</li>
                    <li>🎨 Полноценная арт-терапия</li>
                    <li>💬 Безлимитная поддержка 24/7</li>
                  </ul>
                  <p>Продлите подписку, чтобы не потерять доступ:</p>
                  <a href="https://newdawnjourney.com/premium" class="cta">Продлить подписку</a>
                </div>
                <div class="footer">
                  <p>С заботой, команда Восхода 💚</p>
                  <p>Если у вас есть вопросы — мы всегда рядом.</p>
                </div>
              </div>
            </body>
            </html>
          `;

          try {
            await sendEmail(userEmail, emailSubject, emailHtml);
            console.log(`Email sent to ${userEmail}`);
          } catch (emailError) {
            console.error(`Failed to send email to ${userEmail}:`, emailError);
          }
        }

        results.push({ userId: sub.user_id, success: true });
      } catch (userError) {
        console.error(`Error processing user ${sub.user_id}:`, userError);
        results.push({ userId: sub.user_id, success: false, error: String(userError) });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${results.length} subscriptions`,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in subscription-expiry-reminder:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
