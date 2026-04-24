import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: providerData } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'llm_provider')
      .single();

    const provider = providerData?.value?.value || 'polza';
    const polzaApiKey = Deno.env.get('POLZA_API_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    const checks: any = {
      provider,
      polzaConfigured: !!polzaApiKey,
      lovableConfigured: !!lovableApiKey,
    };

    const ok = provider === 'polza' ? checks.polzaConfigured : checks.lovableConfigured;

    return new Response(
      JSON.stringify({ ok, ...checks }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Health check error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
