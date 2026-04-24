import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getSupabaseClient } from '../_shared/db.ts';
import { getUserFromRequest } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await getUserFromRequest(req);
    const supabase = getSupabaseClient();

    const { enable } = await req.json();

    // Get current subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('id, billing_interval')
      .eq('user_id', user.id)
      .eq('plan', 'premium')
      .eq('status', 'active')
      .maybeSingle();

    if (subError || !subscription) {
      return jsonResponse({ error: 'No active subscription found' }, 404);
    }

    // Only allow toggle for monthly subscriptions
    if (subscription.billing_interval === 'year') {
      return jsonResponse({ error: 'Auto-renew cannot be changed for yearly subscriptions' }, 400);
    }

    // Update auto_renew status
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({ auto_renew: enable })
      .eq('id', subscription.id);

    if (updateError) {
      console.error('Error updating auto_renew:', updateError);
      return jsonResponse({ error: 'Failed to update auto-renew status' }, 500);
    }

    console.log(`Auto-renew ${enable ? 'enabled' : 'disabled'} for user ${user.id}`);

    return jsonResponse({ success: true, auto_renew: enable });
  } catch (error) {
    console.error('Error in toggle-auto-renew:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    if (message === 'Unauthorized') {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
    
    return jsonResponse({ error: message }, 500);
  }
});
