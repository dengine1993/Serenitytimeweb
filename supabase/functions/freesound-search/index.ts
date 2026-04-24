import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, category } = await req.json();
    const FREESOUND_API_KEY = Deno.env.get('FREESOUND_API_KEY');

    if (!FREESOUND_API_KEY) {
      console.error('FREESOUND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build search query based on category
    let searchQuery = query || '';
    if (category === 'nature') {
      searchQuery = searchQuery || 'rain forest ocean waves birds';
    } else if (category === 'meditation') {
      searchQuery = searchQuery || 'meditation zen calm peaceful';
    } else if (category === 'ambient') {
      searchQuery = searchQuery || 'ambient drone atmospheric';
    }

    console.log('Searching Freesound with query:', searchQuery);

    const searchUrl = `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(searchQuery)}&filter=duration:[10 TO 600]&sort=rating_desc&fields=id,name,duration,previews,username&page_size=20`;

    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Token ${FREESOUND_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Freesound API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch sounds', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log(`Found ${data.results?.length || 0} sounds`);

    return new Response(
      JSON.stringify({ sounds: data.results || [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in freesound-search function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
