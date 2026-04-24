import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // User-context client (validates JWT via auth header)
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Service-role client (bypasses RLS for admin queries)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await userClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: role } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!role) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const todayIso = today.toISOString();

    const start7 = new Date(today);
    start7.setUTCDate(start7.getUTCDate() - 6);

    const start30 = new Date(today);
    start30.setUTCDate(start30.getUTCDate() - 29);
    const start30Iso = start30.toISOString();

    // === Core counts ===
    const [
      { count: totalUsers },
      { count: totalPosts },
      { count: totalMessages },
      { count: postsToday },
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('posts').select('id', { count: 'exact', head: true }),
      supabase.from('community_messages').select('id', { count: 'exact', head: true }),
      supabase.from('posts').select('id', { count: 'exact', head: true }).gte('created_at', todayIso),
    ]);

    // === Premium users (subscriptions ∪ profiles.premium_until) ===
    const [premiumSubsRes, premiumProfilesRes] = await Promise.all([
      supabase
        .from('subscriptions')
        .select('user_id, current_period_end')
        .eq('status', 'active')
        .eq('plan', 'premium'),
      supabase
        .from('profiles')
        .select('user_id, premium_until')
        .gt('premium_until', new Date().toISOString()),
    ]);

    const premiumSet = new Set<string>();
    (premiumSubsRes.data || []).forEach((s) => {
      if (!s.current_period_end || new Date(s.current_period_end) > new Date()) {
        if (s.user_id) premiumSet.add(s.user_id);
      }
    });
    (premiumProfilesRes.data || []).forEach((p) => {
      if (p.user_id) premiumSet.add(p.user_id);
    });
    const premiumUsers = premiumSet.size;

    // === Active users 7d (posts + community_messages) ===
    const start7Iso = start7.toISOString();
    const [recentPosts7, recentMessages7] = await Promise.all([
      supabase.from('posts').select('user_id, created_at').gte('created_at', start7Iso),
      supabase.from('community_messages').select('user_id, created_at').gte('created_at', start7Iso),
    ]);

    const activeSet = new Set<string>();
    (recentPosts7.data || []).forEach((p) => p.user_id && activeSet.add(p.user_id));
    (recentMessages7.data || []).forEach((m) => m.user_id && activeSet.add(m.user_id));
    const activeUsers7d = activeSet.size;

    // === Abuse users (>100k tokens in llm_usage) ===
    const { data: usageRows } = await supabase
      .from('llm_usage')
      .select('user_id, total_tokens');

    const tokensByUser: Record<string, number> = {};
    (usageRows || []).forEach((row) => {
      if (!row.user_id) return;
      tokensByUser[row.user_id] = (tokensByUser[row.user_id] || 0) + (row.total_tokens || 0);
    });
    const abuseUsers = Object.values(tokensByUser).filter((t) => t > 100000).length;
    const aiUsageTotal = Object.values(tokensByUser).reduce((sum, t) => sum + t, 0);

    // === Growth (30 days) ===
    const { data: profiles30 } = await supabase
      .from('profiles')
      .select('created_at')
      .gte('created_at', start30Iso);

    const { data: allProfilesBefore } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .lt('created_at', start30Iso);

    // Get baseline cumulative count before window
    const { count: baselineCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .lt('created_at', start30Iso);

    const newByDay = new Map<string, number>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(start30);
      d.setUTCDate(start30.getUTCDate() + i);
      newByDay.set(d.toISOString().slice(0, 10), 0);
    }
    (profiles30 || []).forEach((p) => {
      const key = new Date(p.created_at).toISOString().slice(0, 10);
      if (newByDay.has(key)) {
        newByDay.set(key, (newByDay.get(key) || 0) + 1);
      }
    });

    let cumulative = baselineCount || 0;
    const growth = Array.from(newByDay.entries()).map(([date, newCount]) => {
      cumulative += newCount;
      return {
        date,
        label: date.slice(5).replace('-', '.'),
        new: newCount,
        users: cumulative,
      };
    });

    return new Response(JSON.stringify({
      stats: {
        totalUsers: totalUsers || 0,
        totalPosts: totalPosts || 0,
        totalMessages: totalMessages || 0,
        activeUsers7d,
        premiumUsers,
        postsToday: postsToday || 0,
        abuseUsers,
        aiUsageTotal,
      },
      growth,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('analytics-dashboard error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
