import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Get today's date in user's timezone (YYYY-MM-DD format)
 */
function getTodayInTimezone(timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch {
    // Fallback to Moscow
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Moscow',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  }
}

/**
 * Get yesterday's date in user's timezone
 */
function getYesterdayInTimezone(timezone: string): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(yesterday);
  } catch {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Moscow',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(yesterday);
  }
}

/**
 * Get current hour in user's timezone
 */
function getCurrentHourInTimezone(timezone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    });
    return parseInt(formatter.format(new Date()), 10);
  } catch {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Moscow',
      hour: 'numeric',
      hour12: false,
    });
    return parseInt(formatter.format(new Date()), 10);
  }
}

/**
 * Determine if daily limits should reset
 * Reset happens at 7:00 AM local time
 */
function shouldResetLimits(lastReset: string | null, timezone: string): boolean {
  const currentHour = getCurrentHourInTimezone(timezone);
  
  // Before 7 AM - no reset yet today
  if (currentHour < 7) {
    return false;
  }
  
  // No previous reset - need to reset
  if (!lastReset) {
    return true;
  }
  
  const now = new Date();
  const lastResetDate = new Date(lastReset);
  
  // Get dates in user's timezone for comparison
  const todayStr = getTodayInTimezone(timezone);
  
  // Format last reset date in user's timezone
  let lastResetStr: string;
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    lastResetStr = formatter.format(lastResetDate);
  } catch {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Moscow',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    lastResetStr = formatter.format(lastResetDate);
  }
  
  // If last reset was on a different day and it's past 7 AM, reset
  if (lastResetStr !== todayStr) {
    return true;
  }
  
  // Same day - check if last reset was before 7 AM
  let lastResetHour: number;
  try {
    const hourFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    });
    lastResetHour = parseInt(hourFormatter.format(lastResetDate), 10);
  } catch {
    const hourFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Moscow',
      hour: 'numeric',
      hour12: false,
    });
    lastResetHour = parseInt(hourFormatter.format(lastResetDate), 10);
  }
  
  // If last reset was before 7 AM and now it's >= 7 AM, reset
  return lastResetHour < 7 && currentHour >= 7;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[reset-daily-limits] Processing for user: ${user.id}`);

    // Get user profile with timezone and last reset
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('timezone, last_daily_reset, country, city, birth_year, gender_extended')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('[reset-daily-limits] Profile fetch error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const timezone = profile?.timezone || 'Europe/Moscow';
    const lastReset = profile?.last_daily_reset;

    console.log(`[reset-daily-limits] User timezone: ${timezone}, last reset: ${lastReset}`);

    // Check if reset is needed
    const resetNeeded = shouldResetLimits(lastReset, timezone);
    
    if (!resetNeeded) {
      console.log('[reset-daily-limits] Reset not needed yet');
      return new Response(
        JSON.stringify({ 
          reset: false, 
          message: 'Reset not needed yet',
          current_hour: getCurrentHourInTimezone(timezone),
          timezone 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[reset-daily-limits] Reset needed, proceeding...');

    // Update last_daily_reset
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ last_daily_reset: new Date().toISOString() })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[reset-daily-limits] Failed to update last_daily_reset:', updateError);
    }

    console.log('[reset-daily-limits] Daily reset completed');

    return new Response(
      JSON.stringify({
        reset: true,
        message: 'Daily limits reset completed',
        timezone,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[reset-daily-limits] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
