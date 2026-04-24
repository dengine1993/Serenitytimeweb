/**
 * LLM Provider Abstraction
 * Supports: LOVABLE (default) or OPENROUTER
 */

type LLMProvider = 'LOVABLE' | 'OPENROUTER' | 'POLZA';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LLMResponse {
  text: string;
  tokens: number;
  promptTokens?: number;
  completionTokens?: number;
  model: string;
  cost?: number;
}

export async function callLLM(
  messages: Message[],
  options: {
    maxTokens?: number;
    temperature?: number;
    model?: string;
  } = {}
): Promise<LLMResponse> {
  const provider = ((Deno.env.get('LLM_PROVIDER') || 'LOVABLE') as string).toUpperCase() as LLMProvider;

  switch (provider) {
    case 'POLZA':
      try {
        return await callPolzaLLM(messages, options);
      } catch (error) {
        console.error('[LLM] Polza provider failed, attempting fallback:', error);
        const fallback = ((Deno.env.get('LLM_FALLBACK_PROVIDER') || 'LOVABLE') as string).toUpperCase() as LLMProvider;
        if (fallback === 'POLZA') throw error;
        return fallback === 'OPENROUTER'
          ? callOpenRouter(messages, options)
          : callLovableLLM(messages, options);
      }
    case 'OPENROUTER':
      return callOpenRouter(messages, options);
    case 'LOVABLE':
    default:
      return callLovableLLM(messages, options);
  }
}

async function callLovableLLM(
  messages: Message[],
  options: {
    maxTokens?: number;
    temperature?: number;
    model?: string;
  }
): Promise<LLMResponse> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const model = options.model || 'google/gemini-2.5-flash';
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options.maxTokens || 400,
      temperature: options.temperature || 0.7
    })
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('RATE_LIMIT_EXCEEDED');
    }
    if (response.status === 402) {
      throw new Error('PAYMENT_REQUIRED');
    }
    const error = await response.text();
    throw new Error(`Lovable AI error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  const tokens = data.usage?.total_tokens || 0;

  return {
    text: text.trim(),
    tokens,
    model,
    cost: 0 // Lovable AI billing is separate
  };
}

async function callOpenRouter(
  messages: Message[],
  options: {
    maxTokens?: number;
    temperature?: number;
    model?: string;
  }
): Promise<LLMResponse> {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  const model = options.model || 'anthropic/claude-3-haiku';

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://bezmyatezhnye.app',
      'X-Title': 'Bezmyatezhnye'
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options.maxTokens || 400,
      temperature: options.temperature || 0.7
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  const tokens = data.usage?.total_tokens || 0;

  return {
    text: text.trim(),
    tokens,
    model,
    cost: data.usage?.total_cost || 0
  };
}

async function callPolzaLLM(
  messages: Message[],
  options: {
    maxTokens?: number;
    temperature?: number;
    model?: string;
  }
): Promise<LLMResponse> {
  const apiKey = Deno.env.get('POLZA_API_KEY');
  const baseUrl = Deno.env.get('POLZA_API_BASE') || 'https://api.polza.ai';
  if (!apiKey) {
    throw new Error('POLZA_API_KEY not configured');
  }

  const model = options.model || Deno.env.get('POLZA_CHAT_MODEL') || Deno.env.get('POLZA_JIVA_MODEL') || 'x-ai/grok-4.20';
  const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options.maxTokens ?? 400,
      temperature: options.temperature ?? 0.7,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('RATE_LIMIT_EXCEEDED');
    }
    if (response.status === 402) {
      throw new Error('PAYMENT_REQUIRED');
    }
    const errorText = await response.text().catch(() => '');
    throw new Error(`Polza error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim() || '';
  const promptTokens = data.usage?.prompt_tokens ?? 0;
  const completionTokens = data.usage?.completion_tokens ?? 0;
  const tokens = data.usage?.total_tokens ?? (promptTokens + completionTokens);
  const cost = typeof data.usage?.total_cost === 'number' ? data.usage.total_cost : undefined;

  return {
    text,
    tokens,
    promptTokens,
    completionTokens,
    model,
    cost,
  };
}
