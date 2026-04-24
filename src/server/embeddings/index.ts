/**
 * Фабрика для провайдеров embeddings
 * Поддерживает переключение между Polza и Lovable AI
 */

import * as polza from './polza.js';

export type EmbeddingProvider = 'polza' | 'lovable';

export interface EmbeddingsClient {
  embedBatch(texts: string[]): Promise<number[][]>;
  embedSingle(text: string): Promise<number[]>;
  textHash(text: string): string;
  chunkText(text: string, maxChars?: number): string[];
  getProviderInfo(): {
    provider: string;
    model: string;
    dimensions: number;
    maxBatchSize: number;
  };
}

/**
 * Получить активного провайдера из env
 */
function getActiveProvider(): EmbeddingProvider {
  const provider = process.env.JIVA_EMBED_PROVIDER?.toLowerCase();
  
  if (provider === 'polza') {
    return 'polza';
  }
  
  // По умолчанию используем Polza если ключ есть
  if (process.env.POLZA_API_KEY) {
    return 'polza';
  }
  
  return 'lovable';
}

/**
 * Создать клиент для Polza
 */
function createPolzaClient(): EmbeddingsClient {
  return {
    embedBatch: polza.embedBatch,
    embedSingle: polza.embedSingle,
    textHash: polza.textHash,
    chunkText: polza.chunkText,
    getProviderInfo: polza.getProviderInfo
  };
}

/**
 * Создать клиент для Lovable AI (fallback)
 */
function createLovableClient(): EmbeddingsClient {
  // TODO: реализовать клиент для Lovable AI embeddings
  throw new Error('Lovable AI embeddings client not implemented yet. Use POLZA_API_KEY.');
}

/**
 * Получить клиент для embeddings на основе конфигурации
 */
export function getEmbeddingsClient(): EmbeddingsClient {
  const provider = getActiveProvider();
  
  console.log(`[Embeddings] Using provider: ${provider}`);
  
  switch (provider) {
    case 'polza':
      return createPolzaClient();
    case 'lovable':
      return createLovableClient();
    default:
      throw new Error(`Unknown embedding provider: ${provider}`);
  }
}

/**
 * Экспорт удобных функций
 */
export const embeddings = getEmbeddingsClient();
export const { embedBatch, embedSingle, textHash, chunkText } = embeddings;
