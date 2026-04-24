/**
 * LLM Provider Router
 * Routes requests to appropriate provider and model based on admin settings
 */

import { polzaChat, polzaEmbeddings } from './providers/polza';
import { lovableChat, lovableEmbeddings } from './providers/lovable';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatOptions {
  userId?: string;
  messages: Message[];
  stream?: boolean;
}

interface ModelConfig {
  jiva_primary: string;
  jiva_fallback: string;
  embedding: string;
}

let cachedProvider: 'polza' | 'lovable' = 'polza';
let cachedModels: ModelConfig | null = null;

async function getProviderSettings(): Promise<{ provider: 'polza' | 'lovable'; models: ModelConfig }> {
  try {
    const { data: providerData } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'llm_provider')
      .single();

    const { data: modelsData } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'llm_models')
      .single();

    cachedProvider = (providerData?.value as any)?.value || 'polza';
    cachedModels = (modelsData?.value as any) || {
      jiva_primary: 'anthropic/claude-3-7-sonnet',
      jiva_fallback: 'openai/gpt-4o-mini',
      embedding: 'openai/text-embedding-3-large',
    };

    return { provider: cachedProvider, models: cachedModels };
  } catch (error) {
    console.error('Failed to load provider settings:', error);
    return {
      provider: 'polza',
      models: cachedModels || {
        jiva_primary: 'anthropic/claude-3-7-sonnet',
        jiva_fallback: 'openai/gpt-4o-mini',
        embedding: 'openai/text-embedding-3-large',
      },
    };
  }
}

async function logUsage(
  userId: string | undefined,
  provider: string,
  endpoint: string,
  model: string,
  tokensIn: number,
  tokensOut: number,
  costRub: number,
  status: string
): Promise<void> {
  try {
    await supabase.from('llm_usage').insert({
      user_id: userId,
      provider,
      endpoint,
      model,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      cost_rub: costRub,
      status,
    });
  } catch (error) {
    console.error('Failed to log LLM usage:', error);
  }
}

export async function chatJiva(options: ChatOptions): Promise<any> {
  const { userId, messages, stream = false } = options;
  const { provider, models } = await getProviderSettings();

  const primaryModel = models.jiva_primary;
  const fallbackModel = models.jiva_fallback;

  try {
    const chatFn = provider === 'polza' ? polzaChat : lovableChat;
    const result = await chatFn({ model: primaryModel, messages, stream, max_tokens: 800, temperature: 0.6 });

    if (!stream && typeof result === 'object' && 'text' in result) {
      await logUsage(userId, provider, 'chat', primaryModel, result.usage.prompt_tokens, result.usage.completion_tokens, result.cost, 'success');
    }

    return result;
  } catch (error) {
    console.error('AI primary model failed, trying fallback...', error);

    try {
      const chatFn = provider === 'polza' ? polzaChat : lovableChat;
      const result = await chatFn({ model: fallbackModel, messages, stream, max_tokens: 800, temperature: 0.6 });

      if (!stream && typeof result === 'object' && 'text' in result) {
        await logUsage(userId, provider, 'chat', fallbackModel, result.usage.prompt_tokens, result.usage.completion_tokens, result.cost, 'success');
      }

      return result;
    } catch (fallbackError) {
      console.error('AI fallback also failed:', fallbackError);
      await logUsage(userId || '', provider, 'chat', fallbackModel, 0, 0, 0, 'error');
      throw new Error('AI временно недоступен. Попробуйте позже.');
    }
  }
}

export async function embed(input: string[]): Promise<number[][]> {
  const { provider, models } = await getProviderSettings();
  const model = models.embedding;

  try {
    // Always use Polza for embeddings (Lovable doesn't support them)
    const result = await polzaEmbeddings({ model, input });
    await logUsage(undefined, 'polza', 'embed', model, result.usage.prompt_tokens, 0, 0, 'success');
    return result.embeddings;
  } catch (error) {
    console.error('Embeddings error:', error);
    await logUsage(undefined, 'polza', 'embed', model, 0, 0, 0, 'error');
    throw new Error('Ошибка генерации эмбеддингов');
  }
}
