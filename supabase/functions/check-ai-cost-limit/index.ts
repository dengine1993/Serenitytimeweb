import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get daily cost limit from app_config (default: 500 RUB)
    const { data: configData } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", "ai_daily_cost_limit")
      .single();

    const dailyLimit = configData?.value ? parseFloat(configData.value) : 500;

    // Get today's AI costs
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: usageData } = await supabase
      .from("llm_usage")
      .select("cost_rub")
      .gte("created_at", today.toISOString());

    const todayCost = usageData?.reduce((sum, r) => sum + (Number(r.cost_rub) || 0), 0) || 0;

    console.log(`Daily AI cost: ${todayCost.toFixed(2)} RUB, Limit: ${dailyLimit} RUB`);

    if (todayCost >= dailyLimit) {
      // Check if alert was already sent today
      const { data: existingAlert } = await supabase
        .from("system_notifications")
        .select("id")
        .eq("type", "ai_cost_alert")
        .gte("created_at", today.toISOString())
        .limit(1);

      if (existingAlert && existingAlert.length > 0) {
        console.log("Alert already sent today, skipping");
        return new Response(
          JSON.stringify({ status: "skipped", reason: "alert_already_sent" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get all admin user IDs
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (adminRoles && adminRoles.length > 0) {
        const notifications = adminRoles.map((admin) => ({
          user_id: admin.user_id,
          type: "ai_cost_alert",
          title: "⚠️ Превышен лимит AI-затрат",
          message: `Дневные затраты на AI достигли ${todayCost.toFixed(2)} ₽ (лимит: ${dailyLimit} ₽). Проверьте использование в AI-аналитике.`,
          is_read: false,
        }));

        const { error: insertError } = await supabase
          .from("system_notifications")
          .insert(notifications);

        if (insertError) {
          console.error("Error inserting notifications:", insertError);
          throw insertError;
        }

        console.log(`Alert sent to ${adminRoles.length} admins`);

        return new Response(
          JSON.stringify({
            status: "alert_sent",
            cost: todayCost,
            limit: dailyLimit,
            admins_notified: adminRoles.length,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({
        status: "ok",
        cost: todayCost,
        limit: dailyLimit,
        percentage: ((todayCost / dailyLimit) * 100).toFixed(1),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error checking AI cost limit:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
