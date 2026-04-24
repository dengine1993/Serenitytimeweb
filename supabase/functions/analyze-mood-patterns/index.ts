import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MoodEntry {
  date: string;
  mood: string;
  note: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { entries, language = 'ru' } = await req.json() as { 
      entries: MoodEntry[]; 
      language?: string;
    };

    if (!entries || entries.length < 3) {
      return new Response(
        JSON.stringify({ error: 'Need at least 3 entries for analysis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare mood data for analysis
    const moodSummary = entries.map(e => 
      `${e.date}: ${e.mood}${e.note ? ` - "${e.note}"` : ''}`
    ).join('\n');

    // Count mood frequencies
    const moodCounts: Record<string, number> = {};
    entries.forEach(e => {
      moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
    });
    const moodFrequency = Object.entries(moodCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([mood, count]) => `${mood}: ${count}`)
      .join(', ');

    const systemPrompt = language === 'ru' 
      ? `Ты — заботливая Jiva, анализирующий дневник настроений пользователя.
Твоя задача — найти паттерны и дать тёплую, поддерживающую обратную связь.

ВАЖНО:
- Будь тёплым и поддерживающим
- Замечай позитивные тенденции
- Предлагай мягкие рекомендации
- Не ставь диагнозы
- Используй эмодзи умеренно

Ответь ТОЛЬКО в формате JSON:
{
  "patterns": ["паттерн 1", "паттерн 2"],
  "weekSummary": "краткое резюме недели в 1-2 предложениях",
  "suggestion": "одна мягкая рекомендация"
}`
      : `You are a caring Jiva analyzing a user's mood diary.
Your task is to find patterns and provide warm, supportive feedback.

IMPORTANT:
- Be warm and supportive
- Notice positive trends
- Suggest gentle recommendations
- Don't diagnose
- Use emojis sparingly

Reply ONLY in JSON format:
{
  "patterns": ["pattern 1", "pattern 2"],
  "weekSummary": "brief week summary in 1-2 sentences",
  "suggestion": "one gentle recommendation"
}`;

    const userPrompt = language === 'ru'
      ? `Проанализируй последние записи дневника настроений:

${moodSummary}

Частота настроений: ${moodFrequency}

Найди паттерны и дай тёплую обратную связь.`
      : `Analyze the recent mood diary entries:

${moodSummary}

Mood frequency: ${moodFrequency}

Find patterns and give warm feedback.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded, please try again later' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI gateway error');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse JSON from response
    let insights;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      // Fallback response
      insights = {
        patterns: [],
        weekSummary: language === 'ru' 
          ? 'Ты ведёшь дневник — это уже важный шаг!' 
          : 'You\'re keeping a diary — that\'s already an important step!',
        suggestion: language === 'ru'
          ? 'Продолжай отслеживать своё настроение каждый день'
          : 'Keep tracking your mood every day'
      };
    }

    return new Response(
      JSON.stringify({ insights }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-mood-patterns:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to analyze mood patterns' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
