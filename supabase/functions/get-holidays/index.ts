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
    const { country = 'RU', year } = await req.json();
    const currentYear = year || new Date().getFullYear();

    console.log(`Fetching holidays for ${country}, year ${currentYear}`);

    // Using Calendarific API (free tier available)
    const CALENDARIFIC_API_KEY = Deno.env.get('CALENDARIFIC_API_KEY');

    if (!CALENDARIFIC_API_KEY) {
      console.log('CALENDARIFIC_API_KEY not configured, using mock data');
      
      // Mock data for Russian holidays
      const mockHolidays = [
        {
          name: "Новый год",
          date: `${currentYear}-01-01`,
          description: "Празднование Нового года",
          type: "National Holiday"
        },
        {
          name: "День защитника Отечества",
          date: `${currentYear}-02-23`,
          description: "День защитника Отечества",
          type: "National Holiday"
        },
        {
          name: "Международный женский день",
          date: `${currentYear}-03-08`,
          description: "Международный женский день",
          type: "National Holiday"
        },
        {
          name: "День Победы",
          date: `${currentYear}-05-09`,
          description: "День Победы в Великой Отечественной войне",
          type: "National Holiday"
        },
        {
          name: "День России",
          date: `${currentYear}-06-12`,
          description: "День независимости России",
          type: "National Holiday"
        },
        {
          name: "День народного единства",
          date: `${currentYear}-11-04`,
          description: "День народного единства",
          type: "National Holiday"
        }
      ];

      return new Response(
        JSON.stringify({ holidays: mockHolidays }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiUrl = `https://calendarific.com/api/v2/holidays?api_key=${CALENDARIFIC_API_KEY}&country=${country}&year=${currentYear}`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Calendarific API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch holidays', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log(`Found ${data.response?.holidays?.length || 0} holidays`);

    interface Holiday {
      name: string;
      date: { iso: string };
      description: string;
      type: string[];
    }
    const holidays = (data.response?.holidays || []).map((h: Holiday) => ({
      name: h.name,
      date: h.date.iso,
      description: h.description,
      type: h.type.join(', ')
    }));

    return new Response(
      JSON.stringify({ holidays }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-holidays function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
