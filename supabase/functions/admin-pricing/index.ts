import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PriceUpdate {
  productId: string;
  newPrice: number;
}

interface BulkUpdatePayload {
  mode: 'bulk_update';
  updates: PriceUpdate[];
}

interface UpdatePricePayload {
  productId: string;
  newPrice: number;
}

interface GetPricingPayload {
  action: 'get';
}

type PricingPayload = BulkUpdatePayload | UpdatePricePayload | GetPricingPayload;

const DEFAULT_PRODUCTS: Record<string, any> = {
  premium_subscription_monthly: {
    id: 'premium_subscription_monthly',
    name: 'Premium Monthly',
    description: 'Ежемесячная подписка Premium',
    amount: { value: 690, currency: 'RUB' },
    paymentType: 'subscription',
    entitlement: { kind: 'subscription', plan: 'premium', intervalMonths: 1 },
  },
  premium_subscription_yearly: {
    id: 'premium_subscription_yearly',
    name: 'Premium Yearly',
    description: 'Годовая подписка Premium',
    amount: { value: 6990, currency: 'RUB' },
    paymentType: 'subscription',
    entitlement: { kind: 'subscription', plan: 'premium', intervalMonths: 12 },
  },
};

const ALLOWED_PRODUCT_IDS = new Set(Object.keys(DEFAULT_PRODUCTS));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload: PricingPayload = await req.json();

    // Load current catalog from DB or fall back to defaults
    const { data: configData } = await supabaseAdmin
      .from('app_config')
      .select('value')
      .eq('key', 'product_catalog')
      .maybeSingle();

    const rawValue = typeof configData?.value === 'string'
      ? JSON.parse(configData.value)
      : configData?.value;
    const currentCatalog: Record<string, any> = { ...DEFAULT_PRODUCTS, ...(rawValue?.products || {}) };

    // Strip legacy/unknown products from working copy
    for (const id of Object.keys(currentCatalog)) {
      if (!ALLOWED_PRODUCT_IDS.has(id)) {
        delete currentCatalog[id];
      }
    }

    if ('action' in payload && payload.action === 'get') {
      return new Response(JSON.stringify({ products: currentCatalog }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Normalize to bulk_update form
    const updates: PriceUpdate[] = 'mode' in payload && payload.mode === 'bulk_update'
      ? payload.updates
      : [{ productId: (payload as UpdatePricePayload).productId, newPrice: (payload as UpdatePricePayload).newPrice }];

    if (!Array.isArray(updates) || updates.length === 0) {
      return new Response(JSON.stringify({ error: 'No updates provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const diff: Record<string, { old: number; new: number }> = {};

    for (const update of updates) {
      const { productId, newPrice } = update;
      if (!productId || typeof newPrice !== 'number' || !Number.isFinite(newPrice) || newPrice <= 0 || newPrice > 1_000_000) {
        return new Response(JSON.stringify({ error: `Invalid price for ${productId}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!ALLOWED_PRODUCT_IDS.has(productId)) {
        return new Response(JSON.stringify({ error: `Unknown product: ${productId}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!currentCatalog[productId]) {
        currentCatalog[productId] = DEFAULT_PRODUCTS[productId];
      }
      const oldPrice = currentCatalog[productId].amount.value;
      if (oldPrice === newPrice) continue;
      currentCatalog[productId] = {
        ...currentCatalog[productId],
        amount: { ...currentCatalog[productId].amount, value: newPrice },
      };
      diff[productId] = { old: oldPrice, new: newPrice };
    }

    if (Object.keys(diff).length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No changes', products: currentCatalog }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: upsertError } = await supabaseAdmin
      .from('app_config')
      .upsert({
        key: 'product_catalog',
        value: { products: currentCatalog },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });

    if (upsertError) {
      console.error('[admin-pricing] Upsert error:', upsertError);
      return new Response(JSON.stringify({ error: 'Failed to save pricing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabaseAdmin.from('admin_logs').insert({
      admin_id: caller.id,
      action: 'update_pricing',
      target_type: 'product_catalog',
      target_id: Object.keys(diff).join(','),
      details: { diff },
    });

    console.log('[admin-pricing] Bulk update applied:', diff);

    return new Response(JSON.stringify({
      success: true,
      diff,
      products: currentCatalog,
      message: 'Prices updated successfully',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[admin-pricing] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
