/**
 * Сохранение воспоминаний Jiva.
 * POST { items: [{ content, source_type?, metadata? }, ...] }
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { ingestMemoriesForUser } from '../_shared/embeddings.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

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
    const token = auth.replace('Bearer ', '');
    const { data: claims, error: claimsErr } = await sb.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claims.claims.sub;

    const body = await req.json().catch(() => null) as
      | { items?: Array<{ content: string; source_type?: string; metadata?: Record<string, unknown> }> }
      | null;
    const items = (body?.items ?? []).filter(
      (i) => typeof i?.content === 'string' && i.content.trim().length > 3,
    );

    if (items.length === 0) {
      return new Response(JSON.stringify({ success: true, count: 0, inserted: 0, skipped: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { inserted, skipped } = await ingestMemoriesForUser(userId, items);
    return new Response(JSON.stringify({ success: true, count: inserted, inserted, skipped }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[jiva-embeddings-ingest] error', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'unknown' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
