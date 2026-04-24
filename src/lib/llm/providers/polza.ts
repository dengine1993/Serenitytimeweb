/**
 * Polza AI Provider Client
 * Implements chat completions and embeddings via Polza API
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
  tools?: any[];
  tool_choice?: any;
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

const POLZA_BASE_URL = import.meta.env.VITE_POLZA_BASE_URL || 'https://api.polza.ai/api/v1';
const POLZA_API_KEY = import.meta.env.VITE_POLZA_API_KEY || '';

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 3,
  baseDelay = 500
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (error.status === 429 && i < retries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        console.warn(`Rate limited (429), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

function mapPolzaError(status: number, message: string): Error {
  const errorMap: Record<number, string> = {
    401: 'Проверьте API-ключ Polza',
    402: 'Недостаточно средств у провайдера Polza',
    429: 'Превышен лимит запросов (429). Повторите позже',
    400: `Ошибка запроса: ${message}`,
    500: `Ошибка сервера Polza: ${message}`,
  };
  
  const error: any = new Error(errorMap[status] || `Ошибка провайдера: ${message}`);
  error.status = status;
  return error;
}

export async function polzaChat(options: ChatOptions): Promise<ChatResponse | AsyncIterable<string>> {
  const { model, messages, stream = false, max_tokens = 800, temperature = 0.4, tools, tool_choice } = options;

  const body: any = {
    model,
    messages,
    max_tokens,
    temperature,
  };

  if (tools) body.tools = tools;
  if (tool_choice) body.tool_choice = tool_choice;

  if (stream) {
    return polzaChatStream(body);
  }

  return retryWithBackoff(async () => {
    const response = await fetch(`${POLZA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${POLZA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw mapPolzaError(response.status, errorText);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0 };
    const cost = usage.cost || 0;

    return {
      text,
      usage: { ...usage, cost },
      cost,
      raw: data,
    };
  });
}

async function* polzaChatStream(body: any): AsyncIterable<string> {
  body.stream = true;

  const response = await fetch(`${POLZA_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${POLZA_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw mapPolzaError(response.status, errorText);
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
          console.error('Failed to parse SSE chunk:', e);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function polzaEmbeddings(options: EmbeddingOptions): Promise<EmbeddingResponse> {
  const { model, input } = options;

  return retryWithBackoff(async () => {
    const response = await fetch(`${POLZA_BASE_URL}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${POLZA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, input }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw mapPolzaError(response.status, errorText);
    }

    const data = await response.json();
    const embeddings = data.data?.map((d: any) => d.embedding) || [];
    const usage = data.usage || { prompt_tokens: 0 };

    return { embeddings, usage };
  });
}
