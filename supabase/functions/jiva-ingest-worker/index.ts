/**
 * Jiva Ingest Worker
 *
 * Обрабатывает очередь jiva_ingest_queue: берёт pending записи дневника,
 * считает эмбеддинги, дедуплицирует и пишет в jiva_memory_chunks.
 *
 * Запуск:
 *  - cron каждые 5 минут (см. SQL ниже после деплоя);
 *  - можно дёрнуть руками: POST без тела.
 *
 * Не требует авторизации — защищён INTERNAL_FUNCTION_SECRET в заголовке
 * x-internal-secret (или вызовом cron с anon key, который пропускается edge).
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { embedTextsWithCache } from '../_shared/embeddings.ts';
import { redactPII } from '../_shared/anonymize.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
};

const BATCH_SIZE = 25; // макс записей за прогон
const DEDUP_THRESHOLD = 0.88;

function vecToLiteral(v: number[]): string {
  return '[' + v.join(',') + ']';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // Простая защита: либо валидный internal secret, либо вызов cron-ом по anon
  const internalSecret = Deno.env.get('INTERNAL_FUNCTION_SECRET');
  const providedSecret = req.headers.get('x-internal-secret');
  const auth = req.headers.get('Authorization') ?? '';
  const isCron = auth.includes(Deno.env.get('SUPABASE_ANON_KEY') ?? '___');
  if (internalSecret && providedSecret !== internalSecret && !isCron) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const sbAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    // 1. Берём pending записи
    const { data: queue, error: qErr } = await sbAdmin
      .from('jiva_ingest_queue')
      .select('id, user_id, source_type, source_id, content')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);
    if (qErr) throw qErr;
    if (!queue || queue.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Помечаем как processing (best-effort)
    const ids = (queue as Array<{ id: string }>).map((q) => q.id);
    await sbAdmin
      .from('jiva_ingest_queue')
      .update({ status: 'processing' })
      .in('id', ids);

    // 3. Считаем эмбеддинги батчем (с предварительным redactPII — 152-ФЗ)
    const texts = (queue as Array<{ content: string }>).map((q) => redactPII(q.content));
    const embs = await embedTextsWithCache(texts);

    let inserted = 0;
    let skipped = 0;
    let failed = 0;
    const doneIds: string[] = [];
    const errorIds: string[] = [];

    // 4. Для каждой записи: дедуп → insert → mark done
    for (let i = 0; i < queue.length; i++) {
      const row = queue[i] as {
        id: string;
        user_id: string;
        source_type: string;
        source_id: string | null;
        content: string;
      };
      const emb = embs[i];

      try {
        // дедуп
        let isDup = false;
        try {
          const { data: nearest } = await sbAdmin.rpc('search_jiva_memories', {
            query_user_id: row.user_id,
            query_embedding: vecToLiteral(emb),
            match_count: 1,
          });
          const top = (nearest as Array<{ score: number }> | null)?.[0];
          if (top && top.score > DEDUP_THRESHOLD) isDup = true;
        } catch {
          // ignore — продолжаем insert
        }

        if (isDup) {
          skipped++;
          doneIds.push(row.id);
          continue;
        }

        const { error: insErr } = await sbAdmin.from('jiva_memory_chunks').insert({
          user_id: row.user_id,
          content: redactPII(row.content).slice(0, 2000),
          source_type: row.source_type,
          metadata: { source_id: row.source_id, ingest: 'queue' },
          embedding: vecToLiteral(emb),
        });
        if (insErr) throw insErr;

        inserted++;
        doneIds.push(row.id);
      } catch (e) {
        failed++;
        errorIds.push(row.id);
        await sbAdmin
          .from('jiva_ingest_queue')
          .update({
            status: 'error',
            error: String(e instanceof Error ? e.message : e).slice(0, 500),
            processed_at: new Date().toISOString(),
          })
          .eq('id', row.id);
      }
    }

    if (doneIds.length > 0) {
      await sbAdmin
        .from('jiva_ingest_queue')
        .update({ status: 'done', processed_at: new Date().toISOString() })
        .in('id', doneIds);
    }

    return new Response(
      JSON.stringify({ processed: queue.length, inserted, skipped, failed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('[jiva-ingest-worker] fatal', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
