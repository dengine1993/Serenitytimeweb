/**
 * Admin: AI Memory dashboard.
 * GET ?range=7d|30d|all
 * Возвращает: topUsers, cacheStats, tokenUsage, memoryGrowth.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

function rangeToSince(range: string): string | null {
  const now = Date.now();
  if (range === '7d') return new Date(now - 7 * 86400_000).toISOString();
  if (range === '30d') return new Date(now - 30 * 86400_000).toISOString();
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } },
    );
    const sbAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const token = auth.replace('Bearer ', '');
    const { data: claims, error: claimsErr } = await sb.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claims.claims.sub;

    const { data: roleRow } = await sbAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const range = url.searchParams.get('range') ?? '30d';
    const since = rangeToSince(range);

    // 1. Top users by memory chunks
    let chunksQuery = sbAdmin.from('jiva_memory_chunks').select('user_id');
    if (since) chunksQuery = chunksQuery.gte('created_at', since);
    const { data: chunkRows } = await chunksQuery.limit(50000);
    const userCounts = new Map<string, number>();
    for (const r of (chunkRows ?? []) as Array<{ user_id: string }>) {
      userCounts.set(r.user_id, (userCounts.get(r.user_id) ?? 0) + 1);
    }
    const topIds = Array.from(userCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
    const topUserIds = topIds.map((x) => x[0]);
    const { data: profiles } = topUserIds.length
      ? await sbAdmin
          .from('profiles')
          .select('user_id, display_name, plan, premium_until')
          .in('user_id', topUserIds)
      : { data: [] as Array<{ user_id: string; display_name: string | null; plan: string | null; premium_until: string | null }> };
    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.user_id, p]),
    );
    const topUsers = topIds.map(([uid, count]) => {
      const p = profileMap.get(uid);
      return {
        user_id: uid,
        display_name: p?.display_name ?? '—',
        plan: p?.plan ?? 'free',
        is_premium:
          p?.plan === 'premium' ||
          (p?.premium_until ? new Date(p.premium_until) > new Date() : false),
        memory_count: count,
      };
    });

    const totalChunks = chunkRows?.length ?? 0;
    const activeMemoryUsers = userCounts.size;

    // 2. Cache stats (jiva_embed_usage)
    let usageQuery = sbAdmin
      .from('jiva_embed_usage')
      .select('items, prompt_tokens, meta');
    if (since) usageQuery = usageQuery.gte('created_at', since);
    const { data: usageRows } = await usageQuery.limit(50000);
    let totalEmbedItems = 0;
    let cacheHits = 0;
    let embedPromptTokens = 0;
    for (const r of (usageRows ?? []) as Array<{
      items: number;
      prompt_tokens: number;
      meta: Record<string, unknown> | null;
    }>) {
      const total = (r.meta?.total as number | undefined) ?? r.items;
      const hits = (r.meta?.cache_hits as number | undefined) ?? 0;
      totalEmbedItems += total;
      cacheHits += hits;
      embedPromptTokens += r.prompt_tokens ?? 0;
    }
    const hitRate = totalEmbedItems > 0 ? cacheHits / totalEmbedItems : 0;

    // 3. Token usage from ai_usage_log
    let tokQuery = sbAdmin
      .from('ai_usage_log')
      .select('model, prompt_tokens, completion_tokens, total_tokens, is_premium, created_at');
    if (since) tokQuery = tokQuery.gte('created_at', since);
    const { data: tokRows } = await tokQuery.limit(50000);
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let totalTokens = 0;
    let freeTokens = 0;
    let premiumTokens = 0;
    const byModel = new Map<
      string,
      { prompt: number; completion: number; total: number; calls: number }
    >();
    for (const r of (tokRows ?? []) as Array<{
      model: string;
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
      is_premium: boolean;
    }>) {
      totalPromptTokens += r.prompt_tokens ?? 0;
      totalCompletionTokens += r.completion_tokens ?? 0;
      totalTokens += r.total_tokens ?? 0;
      if (r.is_premium) premiumTokens += r.total_tokens ?? 0;
      else freeTokens += r.total_tokens ?? 0;
      const m = byModel.get(r.model) ?? { prompt: 0, completion: 0, total: 0, calls: 0 };
      m.prompt += r.prompt_tokens ?? 0;
      m.completion += r.completion_tokens ?? 0;
      m.total += r.total_tokens ?? 0;
      m.calls += 1;
      byModel.set(r.model, m);
    }
    const tokenUsage = {
      totalPromptTokens,
      totalCompletionTokens,
      totalTokens,
      freeTokens,
      premiumTokens,
      embedPromptTokens,
      byModel: Array.from(byModel.entries())
        .map(([model, v]) => ({ model, ...v }))
        .sort((a, b) => b.total - a.total),
    };

    // 4. Memory growth per day
    const growthMap = new Map<string, number>();
    let growthQuery = sbAdmin
      .from('jiva_memory_chunks')
      .select('created_at');
    if (since) growthQuery = growthQuery.gte('created_at', since);
    const { data: growthRows } = await growthQuery.limit(50000);
    for (const r of (growthRows ?? []) as Array<{ created_at: string }>) {
      const day = r.created_at.slice(0, 10);
      growthMap.set(day, (growthMap.get(day) ?? 0) + 1);
    }
    const memoryGrowth = Array.from(growthMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return new Response(
      JSON.stringify({
        range,
        kpi: {
          totalChunks,
          activeMemoryUsers,
          hitRate,
          totalTokens,
        },
        topUsers,
        cacheStats: {
          totalEmbedItems,
          cacheHits,
          hitRate,
          embedPromptTokens,
        },
        tokenUsage,
        memoryGrowth,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[admin-ai-memory] error', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'unknown' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
