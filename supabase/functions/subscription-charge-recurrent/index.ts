// Recurring subscription charges via YooKassa saved payment_method_id.
// Triggered daily by pg_cron. Charges subscriptions whose current_period_end
// is within the next 24h, that have auto_renew=true and a saved payment method.
//
// On success: webhook will mark payment as succeeded and grant entitlement
// (extending current_period_end). On failure: increments failed_charge_count,
// sends a notification email; after 3 failures disables auto_renew.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getProductById } from '../_shared/products.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_FAILED_CHARGES = 3;
const CHARGE_WINDOW_HOURS = 24; // charge subs ending in next 24h
const RETRY_INTERVAL_HOURS = 6; // don't retry the same sub more often than this

interface SubscriptionRow {
  id: string;
  user_id: string;
  plan: string;
  billing_interval: string | null;
  current_period_end: string | null;
  auto_renew: boolean | null;
  yookassa_payment_method_id: string | null;
  failed_charge_count: number | null;
  last_charge_attempt_at: string | null;
}

async function chargeOne(
  supabase: ReturnType<typeof createClient>,
  shopId: string,
  secretKey: string,
  sub: SubscriptionRow,
): Promise<{ ok: boolean; reason?: string; paymentId?: string }> {
  // Только месячная подписка — годовая удалена.
  const productId = 'premium_subscription_monthly';

  const product = await getProductById(productId);
  if (!product) {
    return { ok: false, reason: 'product_not_found' };
  }

  const amount = product.amount.value;

  // Create payment row first (so webhook can find it)
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      user_id: sub.user_id,
      product_type: productId,
      provider: 'yookassa',
      amount,
      currency: 'RUB',
      status: 'pending',
      is_recurrent: true,
      meta: {
        catalog_amount: amount,
        subscription_id: sub.id,
        recurrent: true,
      },
    })
    .select()
    .single();

  if (paymentError || !payment) {
    console.error('Failed to create payment row:', paymentError);
    return { ok: false, reason: 'db_insert_failed' };
  }

  const idempotenceKey = crypto.randomUUID();

  const yookassaPayload = {
    amount: { value: amount.toFixed(2), currency: 'RUB' },
    capture: true,
    payment_method_id: sub.yookassa_payment_method_id,
    description: `${product.description} (автопродление)`,
    metadata: {
      user_id: sub.user_id,
      product: productId,
      subscription_id: sub.id,
      recurrent: 'true',
    },
  };

  const response = await fetch('https://api.yookassa.ru/v3/payments', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${shopId}:${secretKey}`)}`,
      'Content-Type': 'application/json',
      'Idempotence-Key': idempotenceKey,
    },
    body: JSON.stringify(yookassaPayload),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('YooKassa charge failed for sub', sub.id, data);
    await supabase
      .from('payments')
      .update({
        status: 'failed',
        meta: {
          ...(payment.meta ?? {}),
          yookassa_error: data,
        },
      })
      .eq('id', payment.id);
    return { ok: false, reason: data?.code || 'yookassa_error', paymentId: payment.id };
  }

  await supabase
    .from('payments')
    .update({
      yookassa_payment_id: data.id,
      meta: {
        ...(payment.meta ?? {}),
        yookassa_data: data,
      },
    })
    .eq('id', payment.id);

  return { ok: true, paymentId: payment.id };
}

async function notifyChargeFailed(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  finalAttempt: boolean,
) {
  const title = finalAttempt
    ? 'Не удалось продлить подписку'
    : 'Проблема с автопродлением';
  const message = finalAttempt
    ? 'Мы трижды не смогли списать оплату. Автопродление отключено — продлите подписку вручную в разделе Premium.'
    : 'Не удалось списать оплату за подписку. Мы попробуем ещё раз. Проверьте, что на карте достаточно средств.';

  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'subscription_charge_failed',
    title,
    message,
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Internal-only: require INTERNAL_FUNCTION_SECRET for cron invocation
  const internalSecret = Deno.env.get('INTERNAL_FUNCTION_SECRET');
  const provided = req.headers.get('x-internal-secret');
  if (!internalSecret || provided !== internalSecret) {
    return new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const shopId = Deno.env.get('YOOKASSA_SHOP_ID');
  const secretKey = Deno.env.get('YOOKASSA_SECRET_KEY');
  if (!shopId || !secretKey) {
    return new Response(JSON.stringify({ error: 'YooKassa keys not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const now = new Date();
  const windowEnd = new Date(now.getTime() + CHARGE_WINDOW_HOURS * 3600_000);
  const retryThreshold = new Date(now.getTime() - RETRY_INTERVAL_HOURS * 3600_000);

  const { data: subs, error } = await supabase
    .from('subscriptions')
    .select('id, user_id, plan, billing_interval, current_period_end, auto_renew, yookassa_payment_method_id, failed_charge_count, last_charge_attempt_at')
    .eq('status', 'active')
    .eq('plan', 'premium')
    .eq('auto_renew', true)
    .not('yookassa_payment_method_id', 'is', null)
    .lte('current_period_end', windowEnd.toISOString())
    .lt('failed_charge_count', MAX_FAILED_CHARGES);

  if (error) {
    console.error('Failed to load subscriptions:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const eligible = (subs ?? []).filter((s) => {
    if (!s.last_charge_attempt_at) return true;
    return new Date(s.last_charge_attempt_at) < retryThreshold;
  });

  console.log(`Recurring charge worker: ${eligible.length} subscriptions eligible (of ${subs?.length ?? 0} matching)`);

  const results: Array<{ subId: string; ok: boolean; reason?: string }> = [];

  for (const sub of eligible) {
    await supabase
      .from('subscriptions')
      .update({ last_charge_attempt_at: now.toISOString() })
      .eq('id', sub.id);

    try {
      const result = await chargeOne(supabase, shopId, secretKey, sub as SubscriptionRow);
      results.push({ subId: sub.id, ok: result.ok, reason: result.reason });

      if (!result.ok) {
        const newCount = (sub.failed_charge_count ?? 0) + 1;
        const finalAttempt = newCount >= MAX_FAILED_CHARGES;
        await supabase
          .from('subscriptions')
          .update({
            failed_charge_count: newCount,
            ...(finalAttempt ? { auto_renew: false } : {}),
          })
          .eq('id', sub.id);

        await notifyChargeFailed(supabase, sub.user_id, finalAttempt);
      } else {
        // Reset counter on success (webhook will extend period_end)
        await supabase
          .from('subscriptions')
          .update({ failed_charge_count: 0 })
          .eq('id', sub.id);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('Unexpected error charging sub', sub.id, msg);
      results.push({ subId: sub.id, ok: false, reason: 'exception' });
    }
  }

  return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
