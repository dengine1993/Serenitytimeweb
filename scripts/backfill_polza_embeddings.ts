/**
 * Backfill script: re-embed existing data with Polza AI
 * Usage: npx tsx scripts/backfill_polza_embeddings.ts [--limit=N] [--batch=N] [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const POLZA_API_KEY = process.env.POLZA_API_KEY!;
const POLZA_EMBED_URL = process.env.POLZA_EMBED_URL || 'https://api.polza.ai/api/v1/embeddings';
const POLZA_EMBED_MODEL = process.env.POLZA_EMBED_MODEL || 'text-embedding-3-large';

// Parse CLI args
const args = process.argv.slice(2);
const getArg = (name: string, defaultValue: string) => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : defaultValue;
};

const MAX_BATCH = Number(getArg('batch', '32'));
const LIMIT = Number(getArg('limit', '2000'));
const DRY_RUN = args.includes('--dry-run');
const COST_PER_1K_TOKENS = 0.13; // Polza pricing in RUB

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !POLZA_API_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, POLZA_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Text utilities
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

function isValuable(text: string): boolean {
  const MIN_CHARS = 80;
  if (text.length < MIN_CHARS) return false;
  
  const nonPunct = text.replace(/[^\p{L}\p{N}]/gu, '');
  if (nonPunct.length < MIN_CHARS * 0.5) return false;
  
  const uniqueChars = new Set(text.toLowerCase()).size;
  return uniqueChars >= 15;
}

// Fetch embeddings from Polza.ai
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

interface MemoryItem {
  userId: string;
  type: 'insight' | 'trigger' | 'win' | 'ritual';
  text: string;
  source: string;
}

// Extract memories from jiva_interactions
async function extractFromInteractions(): Promise<MemoryItem[]> {
  console.log('📊 Extracting from jiva_interactions...');
  
  const { data, error } = await supabase
    .from('jiva_interactions')
    .select('user_id, user_text, ai_text, ts')
    .order('ts', { ascending: false })
    .limit(LIMIT);
  
  if (error) {
    console.error('Error fetching interactions:', error);
    return [];
  }
  
  const memories: MemoryItem[] = [];
  
  for (const row of data || []) {
    const userText = normalizeText(row.user_text || '');
    const aiText = normalizeText(row.ai_text || '');
    
    // Detect wins (successes)
    const winKeywords = ['справился', 'получилось', 'смог', 'победил', 'преодолел', 'удалось'];
    if (winKeywords.some(kw => userText.toLowerCase().includes(kw)) && isValuable(userText)) {
      memories.push({
        userId: row.user_id,
        type: 'win',
        text: userText,
        source: 'jiva_interactions'
      });
    }
    
    // Detect triggers (anxiety sources)
    const triggerKeywords = ['тревожит', 'паника', 'страшно', 'напряжен', 'триггер', 'боюсь'];
    if (triggerKeywords.some(kw => userText.toLowerCase().includes(kw)) && isValuable(userText)) {
      memories.push({
        userId: row.user_id,
        type: 'trigger',
        text: userText,
        source: 'jiva_interactions'
      });
    }
    
    // Detect rituals (practices suggested by Jiva)
    const ritualKeywords = ['попробуй', 'дыхание', 'практика', 'упражнение', 'заземление'];
    if (ritualKeywords.some(kw => aiText.toLowerCase().includes(kw))) {
      const sentences = aiText.split(/[.!?]/);
      const ritualSentence = sentences.find(s => 
        ritualKeywords.some(kw => s.toLowerCase().includes(kw))
      );
      
      if (ritualSentence && isValuable(ritualSentence.trim())) {
        memories.push({
          userId: row.user_id,
          type: 'ritual',
          text: ritualSentence.trim(),
          source: 'jiva_interactions'
        });
      }
    }
  }
  
  console.log(`  ✅ Extracted ${memories.length} memories from interactions`);
  return memories;
}

// Extract memories from emotion_calendar
async function extractFromEmotionCalendar(): Promise<MemoryItem[]> {
  console.log('📊 Extracting from emotion_calendar...');
  
  const { data, error } = await supabase
    .from('emotion_calendar')
    .select('user_id, notes, triggers, mood_score, anxiety_level, date')
    .order('date', { ascending: false })
    .limit(LIMIT);
  
  if (error) {
    console.error('Error fetching emotion calendar:', error);
    return [];
  }
  
  const memories: MemoryItem[] = [];
  
  for (const row of data || []) {
    // Good days = wins
    if ((row.mood_score >= 4 || row.anxiety_level <= 2) && row.notes && isValuable(row.notes)) {
      memories.push({
        userId: row.user_id,
        type: 'win',
        text: normalizeText(row.notes),
        source: 'emotion_calendar'
      });
    }
    
    // Bad days with triggers
    if ((row.anxiety_level >= 4 || row.mood_score <= 2)) {
      if (row.triggers && row.triggers.length > 0) {
        const triggerText = `Триггеры: ${row.triggers.join(', ')}${row.notes ? '. ' + row.notes : ''}`;
        if (isValuable(triggerText)) {
          memories.push({
            userId: row.user_id,
            type: 'trigger',
            text: normalizeText(triggerText),
            source: 'emotion_calendar'
          });
        }
      } else if (row.notes && isValuable(row.notes)) {
        memories.push({
          userId: row.user_id,
          type: 'trigger',
          text: normalizeText(row.notes),
          source: 'emotion_calendar'
        });
      }
    }
  }
  
  console.log(`  ✅ Extracted ${memories.length} memories from emotion calendar`);
  return memories;
}

// Extract from jiva_archive (saved messages)
async function extractFromArchive(): Promise<MemoryItem[]> {
  console.log('📊 Extracting from jiva_archive...');
  
  const { data, error } = await supabase
    .from('jiva_archive')
    .select('user_id, message_text, tags')
    .order('saved_at', { ascending: false })
    .limit(LIMIT);
  
  if (error) {
    console.error('Error fetching archive:', error);
    return [];
  }
  
  const memories: MemoryItem[] = [];
  
  for (const row of data || []) {
    if (!isValuable(row.message_text)) continue;
    
    // Determine type from tags
    let type: 'insight' | 'trigger' | 'win' | 'ritual' = 'insight';
    
    if (row.tags?.includes('win') || row.tags?.includes('victory')) {
      type = 'win';
    } else if (row.tags?.includes('trigger') || row.tags?.includes('anxiety')) {
      type = 'trigger';
    } else if (row.tags?.includes('ritual') || row.tags?.includes('practice')) {
      type = 'ritual';
    }
    
    memories.push({
      userId: row.user_id,
      type,
      text: normalizeText(row.message_text),
      source: 'jiva_archive'
    });
  }
  
  console.log(`  ✅ Extracted ${memories.length} memories from archive`);
  return memories;
}

async function main() {
  console.log('🚀 Starting Polza AI backfill...');
  console.log(`📊 Model: ${POLZA_EMBED_MODEL} (3072D)`);
  console.log(`📦 Batch size: ${MAX_BATCH}, Limit: ${LIMIT}`);
  
  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - no data will be written\n');
  }
  
  // Collect all memories
  const [interactions, calendar, archive] = await Promise.all([
    extractFromInteractions(),
    extractFromEmotionCalendar(),
    extractFromArchive()
  ]);
  
  const allMemories = [...interactions, ...calendar, ...archive];
  console.log(`\n📊 Total collected: ${allMemories.length} memories`);
  
  // Deduplicate by text hash
  const uniqueMemories = new Map<string, MemoryItem>();
  for (const memory of allMemories) {
    const hash = await hashText(memory.text);
    if (!uniqueMemories.has(hash)) {
      uniqueMemories.set(hash, memory);
    }
  }
  
  console.log(`📊 After deduplication: ${uniqueMemories.size} unique memories\n`);
  
  if (DRY_RUN) {
    console.log('✅ Dry run complete - no embeddings generated');
    process.exit(0);
  }
  
  // Process in batches
  const memoriesArray = Array.from(uniqueMemories.values());
  let totalProcessed = 0;
  let totalTokens = 0;
  
  for (let i = 0; i < memoriesArray.length; i += MAX_BATCH) {
    const batch = memoriesArray.slice(i, i + MAX_BATCH);
    const texts = batch.map(m => m.text);
    
    try {
      console.log(`⚡ Processing batch ${Math.floor(i / MAX_BATCH) + 1}/${Math.ceil(memoriesArray.length / MAX_BATCH)}...`);
      
      const embeddings = await fetchEmbeddings(texts);
      
      // Save to database
      for (let j = 0; j < batch.length; j++) {
        const memory = batch[j];
        const embedding = embeddings[j];
        const text_hash = await hashText(memory.text);
        
        await supabase
          .from('jiva_memory_chunks')
          .upsert({
            user_id: memory.userId,
            type: memory.type,
            text: memory.text,
            text_hash,
            embedding: `[${embedding.join(',')}]`,
            meta: { source: memory.source }
          }, { onConflict: 'text_hash', ignoreDuplicates: true });
        
        totalProcessed++;
        totalTokens += estimateTokens(memory.text);
      }
      
      console.log(`  ✅ Saved ${batch.length} chunks`);
      
      // Rate limiting
      await new Promise(r => setTimeout(r, 1000));
      
    } catch (error) {
      console.error(`  ❌ Batch error:`, error);
      // Continue with next batch
    }
  }
  
  const totalCost = (totalTokens / 1000) * COST_PER_1K_TOKENS;
  
  console.log('\n🎉 Backfill complete!');
  console.log(`✅ Processed: ${totalProcessed} memories`);
  console.log(`📊 Tokens: ${totalTokens.toLocaleString()}`);
  console.log(`💰 Estimated cost: ${totalCost.toFixed(2)} ₽`);
}

main().catch(e => {
  console.error('❌ Fatal error:', e);
  process.exit(1);
});
