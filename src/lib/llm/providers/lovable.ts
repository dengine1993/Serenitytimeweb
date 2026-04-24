/**
 * Lovable AI Provider Client (Fallback)
 * Uses Lovable built-in AI gateway
 */

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatOptions {
  model: string;
  messages: Message[];
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
}

interface ChatResponse {
  text: string;
  usage: { prompt_tokens: number; completion_tokens: number; cost?: number };
  cost: number;
  raw: any;
}

interface EmbeddingOptions {
  model: string;
  input: string[];
}

interface EmbeddingResponse {
  embeddings: number[][];
  usage: { prompt_tokens: number };
}

const LOVABLE_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const LOVABLE_API_KEY = import.meta.env.VITE_LOVABLE_API_KEY || '';

// Map Polza model names to Lovable equivalents
function mapToLovableModel(polzaModel: string): string {
  const modelMap: Record<string, string> = {
    'openai/gpt-4o-mini': 'openai/gpt-5-mini',
    'google/gemini-1.5-flash': 'google/gemini-2.5-flash',
    'deepseek/deepseek-chat': 'google/gemini-2.5-flash-lite',
    'anthropic/claude-3-7-sonnet': 'google/gemini-2.5-pro',
  };
  
  return modelMap[polzaModel] || 'google/gemini-2.5-flash';
}

export async function lovableChat(options: ChatOptions): Promise<ChatResponse | AsyncIterable<string>> {
  const { model, messages, stream = false, max_tokens = 800, temperature = 0.4 } = options;
  const lovableModel = mapToLovableModel(model);

  const body = {
    model: lovableModel,
    messages,
    max_tokens,
    temperature,
    stream,
  };

  if (stream) {
    return lovableChatStream(body);
  }

  const response = await fetch(LOVABLE_GATEWAY_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ошибка Lovable AI: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0 };

  return {
    text,
    usage: { ...usage, cost: 0 },
    cost: 0, // Lovable cost not tracked
    raw: data,
  };
}

async function* lovableChatStream(body: any): AsyncIterable<string> {
  const response = await fetch(LOVABLE_GATEWAY_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ошибка Lovable AI: ${response.status} ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim() || line.startsWith(':')) continue;
        if (!line.startsWith('data: ')) continue;

        const data = line.slice(6).trim();
        if (data === '[DONE]') return;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch (e) {
          console.error('Failed to parse Lovable SSE chunk:', e);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function lovableEmbeddings(options: EmbeddingOptions): Promise<EmbeddingResponse> {
  // Lovable doesn't have embeddings endpoint, use Polza or throw error
  throw new Error('Lovable AI не поддерживает embeddings. Используйте Polza для эмбеддингов.');
}
