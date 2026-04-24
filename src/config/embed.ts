/**
 * Polza.ai Embeddings Configuration
 * text-embedding-3-large: 3072 dimensions
 */

export const EMBED = {
  provider: 'polza' as const,
  url: import.meta.env.VITE_POLZA_EMBED_URL || 'https://api.polza.ai/api/v1/embeddings',
  model: import.meta.env.VITE_POLZA_EMBED_MODEL || 'text-embedding-3-large',
  dim: Number(import.meta.env.VITE_EMBED_DIM || 3072),
  // batching knobs
  maxBatch: 32,
  // retry knobs
  maxRetries: 3,
  retryDelayMs: 800
};

// Validate configuration on import
if (!import.meta.env.VITE_POLZA_API_KEY && import.meta.env.MODE === 'production') {
  console.warn('⚠️ POLZA_API_KEY not configured');
}
