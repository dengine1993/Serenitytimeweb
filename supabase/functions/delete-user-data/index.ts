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

    console.log('Deleting user data for:', user.id);

    // Delete all user-related data from ALL tables (GDPR compliance)
    const deletions = await Promise.allSettled([
      // Core user data
      supabase.from('mood_entries').delete().eq('user_id', user.id),
      supabase.from('smer_entries').delete().eq('user_id', user.id),
      supabase.from('emotion_calendar').delete().eq('user_id', user.id),
      supabase.from('daily_checkins').delete().eq('user_id', user.id),
      
      // Art therapy
      supabase.from('art_therapy_sessions').delete().eq('user_id', user.id),
      supabase.from('user_art_therapy_entries').delete().eq('user_id', user.id),
      
      // AI & Chat
      supabase.from('jiva_memory_chunks').delete().eq('user_id', user.id),
      supabase.from('jiva_sessions_v2').delete().eq('user_id', user.id),
      supabase.from('ai_chats').delete().eq('user_id', user.id),
      supabase.from('ai_messages').delete().eq('user_id', user.id),
      supabase.from('llm_usage').delete().eq('user_id', user.id),
      
      // Community & Social
      supabase.from('posts').delete().eq('user_id', user.id),
      supabase.from('post_comments').delete().eq('user_id', user.id),
      supabase.from('post_reactions').delete().eq('user_id', user.id),
      supabase.from('community_messages').delete().eq('user_id', user.id),
      supabase.from('message_reactions').delete().eq('user_id', user.id),
      supabase.from('message_read_receipts').delete().eq('user_id', user.id),
      supabase.from('community_rules_accepted').delete().eq('user_id', user.id),
      
      // Notifications & Push
      supabase.from('notifications').delete().eq('user_id', user.id),
      supabase.from('system_notifications').delete().eq('user_id', user.id),
      supabase.from('push_subscriptions').delete().eq('user_id', user.id),
      
      // Crisis & Navigator
      supabase.from('crisis_sessions').delete().eq('user_id', user.id),
      supabase.from('user_navigator_progress').delete().eq('user_id', user.id),
      
      // Usage & Billing
      supabase.from('usage_counters').delete().eq('user_id', user.id),
      supabase.from('feature_usage').delete().eq('user_id', user.id),
      supabase.from('user_usage').delete().eq('user_id', user.id),
      supabase.from('subscriptions').delete().eq('user_id', user.id),
      supabase.from('payments').delete().eq('user_id', user.id),
      
      // Referrals (both as inviter and invited)
      supabase.from('referrals').delete().or(`referrer_id.eq.${user.id},referred_id.eq.${user.id}`),
      supabase.from('referrals_v2').delete().or(`inviter_user_id.eq.${user.id},invited_user_id.eq.${user.id}`),
      
      
      // Reports (as reporter)
      supabase.from('post_reports').delete().eq('reporter_id', user.id),
      supabase.from('comment_reports').delete().eq('reporter_id', user.id),
      supabase.from('message_reports').delete().eq('reporter_id', user.id),
      
      // A/B tests & Consent
      supabase.from('ab_tests').delete().eq('user_id', user.id),
      supabase.from('consent_log').delete().eq('user_id', user.id),
      
      // Specialist bookings
      supabase.from('specialist_bookings').delete().eq('user_id', user.id),
      
      // Finally, delete profile
      supabase.from('profiles').delete().eq('user_id', user.id)
    ]);

    const tables = [
      'mood_entries', 'smer_entries', 'emotion_calendar', 'daily_checkins',
      'art_therapy_sessions', 'user_art_therapy_entries',
      'jiva_memory_chunks', 'jiva_sessions_v2',
      'ai_chats', 'ai_messages', 'llm_usage',
      'posts', 'post_comments', 'post_reactions', 'community_messages',
      'message_reactions', 'message_read_receipts', 'community_rules_accepted',
      'notifications', 'system_notifications', 'push_subscriptions',
      'crisis_sessions', 'user_navigator_progress',
      'usage_counters', 'feature_usage', 'user_usage', 'subscriptions', 'payments',
      'referrals', 'referrals_v2',
      
      'post_reports', 'comment_reports', 'message_reports',
      'ab_tests', 'consent_log',
      'specialist_bookings',
      'profiles'
    ];

    const results = deletions.map((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`✅ Deleted from ${tables[index]}`);
        return { table: tables[index], success: true };
      } else {
        console.error(`❌ Failed to delete from ${tables[index]}:`, result.reason);
        return { table: tables[index], success: false, error: String(result.reason) };
      }
    });

    const failedDeletions = results.filter(r => !r.success);
    
    if (failedDeletions.length > 0) {
      console.warn('Some deletions failed:', failedDeletions);
    }

    console.log('Deletion completed for user:', user.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Все ваши данные успешно удалены',
        details: results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in delete-user-data:', error);
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
