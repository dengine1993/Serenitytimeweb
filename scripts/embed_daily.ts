/**
 * Daily job: process pending embeddings queue
 * Usage: npm run embed:daily
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const POLZA_API_KEY = process.env.POLZA_API_KEY!;
const POLZA_EMBED_URL = process.env.POLZA_EMBED_URL || 'https://api.polza.ai/api/v1/embeddings';
const POLZA_EMBED_MODEL = process.env.POLZA_EMBED_MODEL || 'text-embedding-3-large';

const BATCH_SIZE = Number(process.env.JIVA_EMBED_BATCH ?? 32);
const DAILY_BUDGET_RUB = Number(process.env.JIVA_EMBED_DAILY_BUDGET_RUB ?? 120);
const COST_PER_1K_TOKENS = 0.13; // Polza pricing

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !POLZA_API_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function hashText(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function normalizeText(s: string): string {
  return s.replace(/\s+/g, ' ').replace(/\u00A0/g, ' ').trim();
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

async function fetchEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await fetch(POLZA_EMBED_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${POLZA_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model: POLZA_EMBED_MODEL, input: texts })
  });

  if (!response.ok) {
    throw new Error(`Polza API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.data.map((d: any) => d.embedding);
}

async function getTodayUsage() {
  const today = new Date().toISOString().split('T')[0];
  
  const { data } = await supabase
    .from('jiva_usage_daily')
    .select('*')
    .eq('day', today)
    .single();
  
  return data ?? { cost_rub: 0, prompt_tokens: 0, total_tokens: 0, chunks: 0 };
}

async function updateUsage(promptTokens: number, chunks: number) {
  const today = new Date().toISOString().split('T')[0];
  const costRub = (promptTokens / 1000) * COST_PER_1K_TOKENS;
  
  const usage = await getTodayUsage();
  
  await supabase
    .from('jiva_usage_daily')
    .upsert({
      day: today,
      prompt_tokens: usage.prompt_tokens + promptTokens,
      total_tokens: usage.total_tokens + promptTokens,
      cost_rub: usage.cost_rub + costRub,
      chunks: usage.chunks + chunks,
      updated_at: new Date().toISOString()
    });
}

async function main() {
  console.log('🌙 Starting daily embeddings job...');
  
  // Check budget
  const usage = await getTodayUsage();
  const remaining = DAILY_BUDGET_RUB - usage.cost_rub;
  
  if (remaining <= 0) {
    console.log('⚠️ Daily budget exhausted, skipping');
    process.exit(0);
  }
  
  console.log(`💰 Remaining budget: ${remaining.toFixed(2)} ₽`);
  
  // Get pending queue items
  const { data: queue } = await supabase
    .from('jiva_ingest_queue')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1000);
  
  if (!queue || queue.length === 0) {
    console.log('✅ No items in queue');
    process.exit(0);
  }
  
  console.log(`📦 Processing ${queue.length} items from queue`);
  
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  
  // Process in batches
  for (let i = 0; i < queue.length; i += BATCH_SIZE) {
    const batch = queue.slice(i, i + BATCH_SIZE);
    const texts = batch.map(item => normalizeText(item.text));
    
    try {
      // Check budget before each batch
      const currentUsage = await getTodayUsage();
      if (currentUsage.cost_rub >= DAILY_BUDGET_RUB) {
        console.log('⚠️ Budget limit reached, stopping');
        break;
      }
      
      console.log(`  ⚡ Embedding batch ${Math.floor(i / BATCH_SIZE) + 1}...`);
      const embeddings = await fetchEmbeddings(texts);
      
      // Save to memory_chunks
      for (let j = 0; j < batch.length; j++) {
        const item = batch[j];
        const embedding = embeddings[j];
        const text_hash = await hashText(texts[j]);
        
        const { error: insertError } = await supabase
          .from('jiva_memory_chunks')
          .upsert({
            user_id: item.user_id,
            type: item.qtype,
            text: texts[j],
            text_hash,
            embedding: `[${embedding.join(',')}]`
          }, { onConflict: 'text_hash', ignoreDuplicates: true });
        
        // Mark as done
        await supabase
          .from('jiva_ingest_queue')
          .update({ 
            status: insertError ? 'error' : 'done',
            error: insertError?.message,
            processed_at: new Date().toISOString()
          })
          .eq('id', item.id);
        
        if (!insertError) processed++;
        else errors++;
      }
      
      // Update usage
      const totalTokens = texts.reduce((sum, t) => sum + estimateTokens(t), 0);
      await updateUsage(totalTokens, batch.length);
      
      // Rate limiting
      await new Promise(r => setTimeout(r, 1000));
      
    } catch (error) {
      console.error(`  ❌ Batch error:`, error);
      
      // Mark all items in batch as error
      for (const item of batch) {
        await supabase
          .from('jiva_ingest_queue')
          .update({
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
            processed_at: new Date().toISOString()
          })
          .eq('id', item.id);
      }
      
      errors += batch.length;
    }
  }
  
  console.log('\n🎉 Daily job complete!');
  console.log(`✅ Processed: ${processed}`);
  console.log(`⚠️ Errors: ${errors}`);
  console.log(`📊 Final usage: ${(await getTodayUsage()).cost_rub.toFixed(2)} ₽`);
}

main().catch(e => {
  console.error('❌ Fatal error:', e);
  process.exit(1);
});
