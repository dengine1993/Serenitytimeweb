import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Mode = "list" | "extend" | "cancel" | "refund" | "grant";

interface ListBody {
  mode?: "list";
  tab?: "subscriptions" | "payments";
  search?: string;
  status?: string;
  plan?: string;
  provider?: string;
  from?: string; // ISO date
  to?: string;   // ISO date
  page?: number;
  pageSize?: number;
}

interface ExtendBody { mode: "extend"; subscriptionId: string; days: number; }
interface CancelBody { mode: "cancel"; subscriptionId: string; reason?: string; }
interface RefundBody { mode: "refund"; paymentId: string; reason?: string; }
interface GrantBody  { mode: "grant"; userId: string; days: number; plan?: string; }

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

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
    const adminId = claimsData.claims.sub as string;

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", adminId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) return json({ error: "Forbidden" }, 403);

    const body = (req.method === "POST" ? await req.json().catch(() => ({})) : {}) as
      | ListBody | ExtendBody | CancelBody | RefundBody | GrantBody;
    const mode: Mode = (body as { mode?: Mode })?.mode ?? "list";

    // ---------- ACTIONS ----------
    if (mode === "extend") {
      const { subscriptionId, days } = body as ExtendBody;
      if (!subscriptionId || !Number.isFinite(days) || days <= 0) {
        return json({ error: "Invalid params" }, 400);
      }
      const { data: sub, error: getErr } = await supabase
        .from("subscriptions").select("*").eq("id", subscriptionId).maybeSingle();
      if (getErr || !sub) return json({ error: "Subscription not found" }, 404);

      const base = sub.current_period_end ? new Date(sub.current_period_end) : new Date();
      if (base.getTime() < Date.now()) base.setTime(Date.now());
      base.setDate(base.getDate() + days);
      const newEnd = base.toISOString();

      const { error: updErr } = await supabase
        .from("subscriptions")
        .update({ current_period_end: newEnd, status: "active", updated_at: new Date().toISOString() })
        .eq("id", subscriptionId);
      if (updErr) throw updErr;

      await supabase.from("profiles")
        .update({ premium_until: newEnd, plan: "premium", updated_at: new Date().toISOString() })
        .eq("user_id", sub.user_id);

      await supabase.from("admin_logs").insert({
        admin_id: adminId, action: "extend_subscription",
        target_type: "subscription", target_id: subscriptionId,
        details: { days, new_end: newEnd, user_id: sub.user_id },
      });

      return json({ ok: true, new_end: newEnd });
    }

    if (mode === "cancel") {
      const { subscriptionId, reason } = body as CancelBody;
      if (!subscriptionId) return json({ error: "Invalid params" }, 400);

      const { data: sub } = await supabase
        .from("subscriptions").select("user_id").eq("id", subscriptionId).maybeSingle();

      const { error: updErr } = await supabase
        .from("subscriptions")
        .update({
          status: "canceled",
          cancelled_at: new Date().toISOString(),
          auto_renew: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscriptionId);
      if (updErr) throw updErr;

      await supabase.from("admin_logs").insert({
        admin_id: adminId, action: "cancel_subscription",
        target_type: "subscription", target_id: subscriptionId,
        details: { reason: reason ?? null, user_id: sub?.user_id ?? null },
      });

      return json({ ok: true });
    }

    if (mode === "refund") {
      const { paymentId, reason } = body as RefundBody;
      if (!paymentId) return json({ error: "Invalid params" }, 400);

      const { data: pay } = await supabase
        .from("payments").select("user_id, amount").eq("id", paymentId).maybeSingle();

      const { error: updErr } = await supabase
        .from("payments")
        .update({ status: "refunded", refunded_at: new Date().toISOString() })
        .eq("id", paymentId);
      if (updErr) throw updErr;

      await supabase.from("admin_logs").insert({
        admin_id: adminId, action: "refund_payment",
        target_type: "payment", target_id: paymentId,
        details: { reason: reason ?? null, amount: pay?.amount ?? null, user_id: pay?.user_id ?? null },
      });

      return json({ ok: true });
    }

    if (mode === "grant") {
      const { userId, days, plan } = body as GrantBody;
      if (!userId || !Number.isFinite(days) || days <= 0) {
        return json({ error: "Invalid params" }, 400);
      }
      const planName = plan ?? "premium";
      const start = new Date();
      const end = new Date(); end.setDate(end.getDate() + days);

      const { data: existing } = await supabase
        .from("subscriptions")
        .select("id, current_period_end")
        .eq("user_id", userId)
        .eq("plan", planName)
        .eq("status", "active")
        .maybeSingle();

      let subId = existing?.id;
      if (existing) {
        const baseEnd = existing.current_period_end && new Date(existing.current_period_end) > start
          ? new Date(existing.current_period_end) : start;
        baseEnd.setDate(baseEnd.getDate() + days);
        await supabase.from("subscriptions").update({
          current_period_end: baseEnd.toISOString(),
          status: "active",
          updated_at: new Date().toISOString(),
        }).eq("id", existing.id);
        end.setTime(baseEnd.getTime());
      } else {
        const { data: created, error: insErr } = await supabase.from("subscriptions").insert({
          user_id: userId,
          plan: planName,
          status: "active",
          current_period_start: start.toISOString(),
          current_period_end: end.toISOString(),
          payment_provider: "admin_manual",
          auto_renew: false,
        }).select("id").maybeSingle();
        if (insErr) throw insErr;
        subId = created?.id;
      }

      await supabase.from("profiles")
        .update({ premium_until: end.toISOString(), plan: planName, updated_at: new Date().toISOString() })
        .eq("user_id", userId);

      await supabase.from("admin_logs").insert({
        admin_id: adminId, action: "grant_premium",
        target_type: "user", target_id: userId,
        details: { days, plan: planName, end: end.toISOString(), subscription_id: subId },
      });

      return json({ ok: true, subscription_id: subId, end: end.toISOString() });
    }

    // ---------- LIST ----------
    const lb = body as ListBody;
    const tab = lb.tab ?? "subscriptions";
    const page = Math.max(1, Number(lb.page) || 1);
    const pageSize = Math.min(200, Math.max(10, Number(lb.pageSize) || 25));
    const fromIdx = (page - 1) * pageSize;
    const toIdx = fromIdx + pageSize - 1;

    // Build queries with filters
    const buildSubsQuery = () => {
      let q = supabase.from("subscriptions").select("*", { count: "exact" });
      if (lb.status && lb.status !== "all") q = q.eq("status", lb.status);
      if (lb.plan && lb.plan !== "all") q = q.eq("plan", lb.plan);
      if (lb.provider && lb.provider !== "all") q = q.eq("payment_provider", lb.provider);
      if (lb.from) q = q.gte("created_at", lb.from);
      if (lb.to) q = q.lte("created_at", lb.to);
      if (lb.search) q = q.or(`external_id.ilike.%${lb.search}%,user_id.ilike.%${lb.search}%`);
      return q.order("created_at", { ascending: false });
    };
    const buildPaymentsQuery = () => {
      let q = supabase.from("payments").select("*", { count: "exact" });
      if (lb.status && lb.status !== "all") q = q.eq("status", lb.status);
      if (lb.provider && lb.provider !== "all") q = q.eq("provider", lb.provider);
      if (lb.from) q = q.gte("created_at", lb.from);
      if (lb.to) q = q.lte("created_at", lb.to);
      if (lb.search) {
        q = q.or(
          `external_id.ilike.%${lb.search}%,yookassa_payment_id.ilike.%${lb.search}%,user_id.ilike.%${lb.search}%`
        );
      }
      return q.order("created_at", { ascending: false });
    };

    const pageQuery = (tab === "subscriptions" ? buildSubsQuery() : buildPaymentsQuery()).range(fromIdx, toIdx);

    // Stats: aggregate over ALL data (not page-bound)
    const [pageRes, subsAllRes, paymentsAllRes] = await Promise.all([
      pageQuery,
      supabase.from("subscriptions").select("user_id, plan, status, current_period_end, billing_interval"),
      supabase.from("payments").select("amount, status, refunded_at, created_at"),
    ]);

    if (pageRes.error) throw pageRes.error;
    if (subsAllRes.error) throw subsAllRes.error;
    if (paymentsAllRes.error) throw paymentsAllRes.error;

    const rows = pageRes.data ?? [];
    const total = pageRes.count ?? rows.length;

    // Merge profiles
    const userIds = Array.from(new Set(rows.map((r: { user_id: string }) => r.user_id).filter(Boolean)));
    let profilesMap = new Map<string, { display_name: string | null; username: string | null; avatar_url: string | null }>();
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", userIds);
      profilesMap = new Map((profs ?? []).map((p) => [p.user_id, p]));
    }

    const enriched = rows.map((r: Record<string, unknown> & { user_id: string }) => ({
      ...r,
      profile: profilesMap.get(r.user_id) ?? null,
    }));

    // Stats
    const now = Date.now();
    const subsAll = subsAllRes.data ?? [];
    const paysAll = paymentsAllRes.data ?? [];

    const activeSubs = subsAll.filter((s) =>
      s.status === "active" &&
      s.plan !== "free" &&
      (!s.current_period_end || new Date(s.current_period_end).getTime() > now)
    ).length;

    const grossRevenue = paysAll
      .filter((p) => p.status === "succeeded")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const refundedAmount = paysAll
      .filter((p) => p.status === "refunded" || p.refunded_at)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const netRevenue = grossRevenue - refundedAmount;

    // MRR — sum of monthly subscription prices (rough estimate from recent payments per active sub user)
    // Simple approach: count active monthly subs * average monthly payment amount
    const activeMonthly = subsAll.filter((s) =>
      s.status === "active" && s.plan !== "free" && (s.billing_interval === "month" || !s.billing_interval) &&
      (!s.current_period_end || new Date(s.current_period_end).getTime() > now)
    );
    const succeededPays = paysAll.filter((p) => p.status === "succeeded");
    const avgCheck = succeededPays.length > 0
      ? grossRevenue / succeededPays.length : 0;
    const mrr = Math.round(activeMonthly.length * avgCheck);

    return json({
      rows: enriched,
      total,
      page,
      pageSize,
      stats: {
        activeSubs,
        totalPayments: paysAll.length,
        grossRevenue,
        netRevenue,
        refundedAmount,
        mrr,
        avgCheck: Math.round(avgCheck),
      },
    });
  } catch (error) {
    console.error("admin-payments error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 400;
    return json({ error: message }, status);
  }
});
