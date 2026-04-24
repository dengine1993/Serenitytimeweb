/**
 * LLM Configuration
 * Reads ENV and exports typed config for Polza AI integration
 */

export interface LLMConfig {
  provider: 'polza' | 'lovable';
  polzaBaseUrl: string;
  polzaApiKey: string;
  lovableApiKey: string;
  models: {
    jivaPrimary: string;
    jivaFallback: string;
    embedding: string;
  };
  defaults: {
    maxTokens: number;
    temperature: number;
    stream: boolean;
  };
}

function getEnv(key: string, fallback?: string): string {
  const value = import.meta.env[key] || process.env[key];
  if (!value && !fallback) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || fallback!;
}

export const llmConfig: LLMConfig = {
  provider: (getEnv('VITE_LLM_PROVIDER_DEFAULT', 'polza')) as 'polza' | 'lovable',
  polzaBaseUrl: getEnv('VITE_POLZA_BASE_URL', 'https://api.polza.ai/api/v1'),
  polzaApiKey: getEnv('VITE_POLZA_API_KEY', ''),
  lovableApiKey: getEnv('VITE_LOVABLE_API_KEY', ''),
  models: {
    jivaPrimary: getEnv('VITE_LLM_MODEL_JIVA_PRIMARY', 'anthropic/claude-3-7-sonnet'),
    jivaFallback: getEnv('VITE_LLM_MODEL_JIVA_FALLBACK', 'openai/gpt-4o-mini'),
    embedding: getEnv('VITE_EMBEDDING_MODEL', 'openai/text-embedding-3-large'),
  },
  defaults: {
    maxTokens: parseInt(getEnv('VITE_LLM_MAX_TOKENS', '800')),
    temperature: parseFloat(getEnv('VITE_LLM_TEMPERATURE', '0.4')),
    stream: getEnv('VITE_LLM_STREAM_DEFAULT', 'true') === 'true',
  },
};

export function validatePolzaConfig(): void {
  if (llmConfig.provider === 'polza' && !llmConfig.polzaApiKey) {
    throw new Error('POLZA_API_KEY is required when provider=polza');
  }
}
