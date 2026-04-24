import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing consent withdrawal for user ${user.id}`);

    // Get client IP
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0]?.trim() || realIp || '';

    // Log the withdrawal in consent_log (immutable record)
    const consentTypes = ['offer', 'privacy', 'immediate_service'];
    
    for (const consentType of consentTypes) {
      await supabaseClient.from('consent_log').insert({
        user_id: user.id,
        consent_type: consentType,
        document_version: 'withdrawn',
        action: 'withdrawn',
        context: 'user_request',
        ip_address: ipAddress,
        user_agent: req.headers.get('user-agent') || ''
      });
    }

    console.log(`Logged consent withdrawal for user ${user.id}`);

    // Delete user data from various tables
    const tablesToClear = [
      'ai_messages',
      'ai_chats',
      'mood_entries',
      'smer_entries',
      'emotion_calendar',
      'daily_checkins',
      'art_therapy_sessions',
      'user_art_therapy_entries',
      'crisis_sessions',
      'jiva_memory_chunks',
      'jiva_sessions_v2',
      'posts',
      'post_reactions',
      'post_comments',
      'community_messages',
      'message_reactions',
      'notifications',
      'system_notifications',
      'push_subscriptions',
      'usage_counters',
      'feature_usage',
      'llm_usage',
      'user_navigator_progress',
      
    ];

    for (const table of tablesToClear) {
      try {
        const { error } = await supabaseClient
          .from(table)
          .delete()
          .eq('user_id', user.id);
        
        if (error) {
          console.warn(`Failed to delete from ${table}:`, error.message);
        } else {
          console.log(`Deleted data from ${table}`);
        }
      } catch (e) {
        console.warn(`Error deleting from ${table}:`, e);
      }
    }

    // Update profile to clear personal data but keep the record
    await supabaseClient
      .from('profiles')
      .update({
        display_name: 'Удалённый пользователь',
        username: `deleted_${user.id.substring(0, 8)}`,
        avatar_url: null,
        bio: null,
        full_name: null,
        blocked_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    console.log(`Cleared profile for user ${user.id}`);

    // Delete the auth user (this will cascade to profile via trigger)
    const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(user.id);
    
    if (deleteError) {
      console.error('Failed to delete auth user:', deleteError);
      // Continue anyway - data is already cleared
    } else {
      console.log(`Deleted auth user ${user.id}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Consent withdrawn and data deleted' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in withdraw-consent:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
