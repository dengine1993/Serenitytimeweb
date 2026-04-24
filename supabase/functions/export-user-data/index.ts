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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('Exporting data for user:', user.id);

    // Collect user data from existing tables
    const [
      { data: profile },
      { data: moodEntries },
      { data: smerEntries },
      { data: artSessions },
      { data: memoryChunks },
      { data: sessions }
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('mood_entries').select('*').eq('user_id', user.id),
      supabase.from('smer_entries').select('*').eq('user_id', user.id),
      supabase.from('art_therapy_sessions').select('*').eq('user_id', user.id),
      supabase.from('jiva_memory_chunks').select('*').eq('user_id', user.id),
      supabase.from('jiva_sessions_v2').select('*').eq('user_id', user.id)
    ]);

    const userData = {
      user_id: user.id,
      exported_at: new Date().toISOString(),
      profile: profile || null,
      mood_diary: moodEntries || [],
      smer_diary: smerEntries || [],
      art_therapy: artSessions || [],
      memory_chunks: memoryChunks || [],
      sessions: sessions || [],
      statistics: {
        mood_entries: moodEntries?.length || 0,
        smer_entries: smerEntries?.length || 0,
        art_sessions: artSessions?.length || 0,
        memory_chunks: memoryChunks?.length || 0,
        sessions: sessions?.length || 0
      }
    };

    console.log('Export completed:', userData.statistics);

    return new Response(
      JSON.stringify(userData),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="bezm-data-${user.id}-${Date.now()}.json"`
        },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in export-user-data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
