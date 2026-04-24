/**
 * Polza.ai Embeddings Service
 * text-embedding-3-large (3072 dim) с кэшем по SHA-256 и батчингом.
 */

import { getSupabaseClient } from './db.ts';

const POLZA_API_KEY = Deno.env.get('POLZA_API_KEY');
const POLZA_EMBED_URL =
  Deno.env.get('POLZA_EMBED_URL') || 'https://api.polza.ai/api/v1/embeddings';
const POLZA_EMBED_MODEL =
  Deno.env.get('POLZA_EMBED_MODEL') || 'text-embedding-3-large';
const MAX_BATCH = 32;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 800;

type EmbedResponse = {
  data: { embedding: number[]; index: number }[];
  usage?: { prompt_tokens?: number; total_tokens?: number };
};

async function hashText(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function normalizeText(s: string): string {
  return s.replace(/\s+/g, ' ').replace(/\u00A0/g, ' ').trim();
}

/**
 * pgvector принимает строку формата '[0.1,0.2,...]'
 */
function vecToLiteral(v: number[]): string {
  return '[' + v.join(',') + ']';
}

async function fetchBatch(inputs: string[]): Promise<EmbedResponse> {
  if (!POLZA_API_KEY) throw new Error('POLZA_API_KEY not configured');

  let lastErr: unknown = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(POLZA_EMBED_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${POLZA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: POLZA_EMBED_MODEL, input: inputs }),
      });

      if (res.ok) return (await res.json()) as EmbedResponse;

      const txt = await res.text();
      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
        lastErr = new Error(`Polza ${res.status}: ${txt}`);
        continue;
      }
      throw new Error(`Polza API error ${res.status}: ${txt}`);
    } catch (err) {
      lastErr = err;
      if (attempt === MAX_RETRIES - 1) throw err;
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Embeddings failed');
}

/**
 * Возвращает эмбеддинги для каждого текста, используя кэш по hash.
 */
export async function embedTextsWithCache(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const supabase = getSupabaseClient();
  const normalized = texts.map(normalizeText);
  const hashes = await Promise.all(normalized.map(hashText));

  const { data: cached } = await supabase
    .from('jiva_embed_cache')
    .select('hash, embedding')
    .in('hash', hashes);

  const cacheMap = new Map<string, number[]>();
  if (cached) {
    for (const r of cached as Array<{ hash: string; embedding: unknown }>) {
      // pgvector возвращает строку '[0.1,...]' через PostgREST
      const emb =
        typeof r.embedding === 'string'
          ? JSON.parse(r.embedding as string)
          : (r.embedding as number[]);
      cacheMap.set(r.hash, emb);
    }
  }

  const missing: { hash: string; text: string }[] = [];
  normalized.forEach((t, i) => {
    if (!cacheMap.has(hashes[i])) missing.push({ hash: hashes[i], text: t });
  });

  let promptTokens = 0;
  for (let i = 0; i < missing.length; i += MAX_BATCH) {
    const batch = missing.slice(i, i + MAX_BATCH);
    const resp = await fetchBatch(batch.map((b) => b.text));
    promptTokens += resp.usage?.prompt_tokens ?? 0;

    const inserts: Array<{ hash: string; embedding: string }> = [];
    resp.data.forEach((d, j) => {
      const h = batch[j].hash;
      cacheMap.set(h, d.embedding);
      inserts.push({ hash: h, embedding: vecToLiteral(d.embedding) });
    });
    if (inserts.length > 0) {
      await supabase
        .from('jiva_embed_cache')
        .upsert(inserts, { onConflict: 'hash' });
    }
  }

  if (missing.length > 0) {
    await supabase.from('jiva_embed_usage').insert({
      provider: 'polza',
      model: POLZA_EMBED_MODEL,
      items: missing.length,
      prompt_tokens: promptTokens,
      meta: { cache_hits: texts.length - missing.length, total: texts.length },
    });
  }

  return hashes.map((h) => cacheMap.get(h)!);
}

/**
 * Сохраняет тексты как воспоминания пользователя с эмбеддингами.
 * Дедуп: чанки с cosine similarity > DEDUP_THRESHOLD к существующей памяти юзера пропускаются.
 */
const DEDUP_THRESHOLD = 0.92;

export async function ingestMemoriesForUser(
  userId: string,
  items: Array<{ content: string; source_type?: string; metadata?: Record<string, unknown> }>,
): Promise<{ inserted: number; skipped: number }> {
  if (items.length === 0) return { inserted: 0, skipped: 0 };
  const supabase = getSupabaseClient();
  const texts = items.map((i) => i.content);
  const embeddings = await embedTextsWithCache(texts);

  const rows: Array<Record<string, unknown>> = [];
  let skipped = 0;

  for (let i = 0; i < items.length; i++) {
    const emb = embeddings[i];
    try {
      const { data: nearest } = await supabase.rpc('search_jiva_memories', {
        query_user_id: userId,
        query_embedding: vecToLiteral(emb),
        match_count: 1,
      });
      const top = (nearest as Array<{ score: number }> | null)?.[0];
      if (top && top.score > DEDUP_THRESHOLD) {
        skipped++;
        continue;
      }
    } catch (e) {
      console.warn('[embeddings] dedup search failed', e);
    }
    rows.push({
      user_id: userId,
      content: items[i].content,
      source_type: items[i].source_type ?? 'chat',
      metadata: items[i].metadata ?? {},
      embedding: vecToLiteral(emb),
    });
  }

  if (rows.length > 0) {
    const { error } = await supabase.from('jiva_memory_chunks').insert(rows);
    if (error) throw error;
  }
  return { inserted: rows.length, skipped };
}

/**
 * Поиск top-K воспоминаний по cosine similarity.
 */
export async function searchSimilarMemories(
  userId: string,
  queryText: string,
  k = 8,
): Promise<Array<{ id: string; content: string; source_type: string | null; score: number; created_at: string }>> {
  const supabase = getSupabaseClient();
  const [vec] = await embedTextsWithCache([queryText]);

  const { data, error } = await supabase.rpc('search_jiva_memories', {
    query_user_id: userId,
    query_embedding: vecToLiteral(vec),
    match_count: k,
  });
  if (error) {
    console.error('[search_jiva_memories] error', error);
    return [];
  }
  return (data ?? []) as Array<{
    id: string;
    content: string;
    source_type: string | null;
    score: number;
    created_at: string;
  }>;
}
