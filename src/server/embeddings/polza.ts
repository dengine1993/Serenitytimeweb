/**
 * Polza.ai Embeddings Client
 * Модель: text-embedding-3-large (3072 dimensions)
 */

import crypto from 'crypto';

const POLZA_API_URL = 'https://api.polza.ai/api/v1/embeddings';
const POLZA_MODEL = 'text-embedding-3-large';
const MAX_BATCH_SIZE = 32;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 800;

interface EmbedResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  usage?: {
    prompt_tokens?: number;
    total_tokens?: number;
  };
}

/**
 * Генерация SHA-256 хэша текста для дедупликации
 */
export function textHash(text: string): string {
  const normalized = normalizeText(text);
  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/**
 * Нормализация текста (убираем лишние пробелы)
 */
function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\u00A0/g, ' ')
    .trim();
}

/**
 * Чанкинг длинного текста на части (макс ~500 токенов = ~2000 символов)
 */
export function chunkText(text: string, maxChars: number = 2000): string[] {
  const normalized = normalizeText(text);
  
  if (normalized.length <= maxChars) {
    return [normalized];
  }

  const chunks: string[] = [];
  const sentences = normalized.split(/[.!?]+\s+/);
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChars) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        // Предложение само по себе слишком длинное
        chunks.push(sentence.substring(0, maxChars));
        currentChunk = sentence.substring(maxChars);
      }
    } else {
      currentChunk += (currentChunk ? '. ' : '') + sentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(c => c.length > 0);
}

/**
 * Получение API ключа из переменных окружения
 */
function getApiKey(): string {
  const key = process.env.POLZA_API_KEY;
  if (!key) {
    throw new Error('POLZA_API_KEY not found in environment variables');
  }
  return key;
}

/**
 * Вызов Polza API с retry логикой
 */
async function fetchEmbeddings(texts: string[]): Promise<EmbedResponse> {
  const apiKey = getApiKey();

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(POLZA_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: POLZA_MODEL,
          input: texts
        })
      });

      if (response.ok) {
        return await response.json();
      }

      // Retry на rate limit или server errors
      if (response.status === 429 || response.status >= 500) {
        const delay = RETRY_DELAY_MS * (attempt + 1);
        console.warn(`[Polza] Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms (status: ${response.status})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Другие ошибки - не retry
      const errorText = await response.text();
      throw new Error(`Polza API error ${response.status}: ${errorText}`);

    } catch (error) {
      if (attempt === MAX_RETRIES - 1) {
        throw error;
      }
      
      const delay = RETRY_DELAY_MS * (attempt + 1);
      console.warn(`[Polza] Network error, retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Failed to fetch embeddings after retries');
}

/**
 * Генерация embeddings для массива текстов с батчингом
 * @param texts - массив текстов для embedding
 * @returns массив векторов (каждый вектор - массив из 3072 чисел)
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  // Нормализуем все тексты
  const normalized = texts.map(normalizeText);

  // Батчинг
  const results: number[][] = [];
  let totalTokens = 0;

  for (let i = 0; i < normalized.length; i += MAX_BATCH_SIZE) {
    const batch = normalized.slice(i, i + MAX_BATCH_SIZE);
    
    console.log(`[Polza] Processing batch ${Math.floor(i / MAX_BATCH_SIZE) + 1}/${Math.ceil(normalized.length / MAX_BATCH_SIZE)}`);
    
    const response = await fetchEmbeddings(batch);
    
    // Добавляем embeddings в правильном порядке
    for (const item of response.data) {
      results[i + item.index] = item.embedding;
    }

    if (response.usage?.prompt_tokens) {
      totalTokens += response.usage.prompt_tokens;
    }
  }

  console.log(`[Polza] Total tokens used: ${totalTokens}`);
  
  return results;
}

/**
 * Генерация одного embedding
 */
export async function embedSingle(text: string): Promise<number[]> {
  const result = await embedBatch([text]);
  return result[0];
}

/**
 * Получение информации о провайдере
 */
export function getProviderInfo() {
  return {
    provider: 'polza',
    model: POLZA_MODEL,
    dimensions: 3072,
    maxBatchSize: MAX_BATCH_SIZE
  };
}
