import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { differenceInDays } from 'npm:date-fns@3';
import { getSupabaseClient } from '../_shared/db.ts';
import { getUserFromRequest } from '../_shared/auth.ts';
import { getProductById } from '../_shared/products.ts';

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

const YOOKASSA_SHOP_ID = Deno.env.get('YOOKASSA_SHOP_ID') ?? '';
const YOOKASSA_SECRET_KEY = Deno.env.get('YOOKASSA_SECRET_KEY') ?? '';
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://preview--serenitylight.lovable.app';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await getUserFromRequest(req);
    const supabase = getSupabaseClient();

    const { targetInterval } = await req.json();

    if (targetInterval !== 'year') {
      return jsonResponse({ error: 'Only upgrade to yearly is supported' }, 400);
    }

    // Get current monthly subscription
    const { data: currentSub, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('plan', 'premium')
      .eq('status', 'active')
      .maybeSingle();

    if (subError || !currentSub) {
      return jsonResponse({ error: 'No active subscription found' }, 404);
    }

    // Check if already yearly
    if (currentSub.billing_interval === 'year') {
      return jsonResponse({ error: 'Already on yearly subscription' }, 400);
    }

    // Get yearly product price
    const yearlyProduct = await getProductById('premium_subscription_yearly');
    if (!yearlyProduct) {
      return jsonResponse({ error: 'Yearly product not found' }, 500);
    }

    // Calculate remaining days value
    const now = new Date();
    const periodEnd = currentSub.current_period_end ? new Date(currentSub.current_period_end) : now;
    const remainingDays = Math.max(0, differenceInDays(periodEnd, now));
    
    // Get monthly price to calculate daily rate
    const monthlyProduct = await getProductById('premium_subscription_monthly');
    const monthlyPrice = monthlyProduct?.amount.value || 690;
    const dailyRate = monthlyPrice / 30;
    const remainingValue = Math.round(remainingDays * dailyRate);

    // Calculate upgrade price (yearly - remaining value)
    const yearlyPrice = yearlyProduct.amount.value;
    const upgradePrice = Math.max(100, yearlyPrice - remainingValue); // Minimum 100 RUB

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        amount: upgradePrice,
        currency: 'RUB',
        status: 'pending',
        provider: 'yookassa',
        product_type: 'subscription_upgrade',
        meta: {
          from_interval: 'month',
          to_interval: 'year',
          remaining_days: remainingDays,
          remaining_value: remainingValue,
          original_yearly_price: yearlyPrice,
        }
      })
      .select()
      .single();

    if (paymentError || !payment) {
      console.error('Error creating payment:', paymentError);
      return jsonResponse({ error: 'Failed to create payment' }, 500);
    }

    // Create YooKassa payment
    const idempotenceKey = crypto.randomUUID();
    const yooResponse = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotence-Key': idempotenceKey,
        'Authorization': 'Basic ' + btoa(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`),
      },
      body: JSON.stringify({
        amount: {
          value: upgradePrice.toFixed(2),
          currency: 'RUB',
        },
        capture: true,
        confirmation: {
          type: 'redirect',
          return_url: `${req.headers.get('origin') ?? SITE_URL}/payment-success?type=upgrade`,
        },
        description: `Апгрейд подписки на год (экономия ${remainingValue} ₽)`,
        metadata: {
          user_id: user.id,
          payment_id: payment.id,
          productId: 'premium_subscription_yearly',
          upgrade: true,
        },
      }),
    });

    if (!yooResponse.ok) {
      const errorData = await yooResponse.text();
      console.error('YooKassa error:', errorData);
      
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', payment.id);
      
      return jsonResponse({ error: 'Payment provider error' }, 500);
    }

    const yooPayment = await yooResponse.json();
    
    // Update payment with YooKassa ID
    await supabase
      .from('payments')
      .update({ 
        yookassa_payment_id: yooPayment.id,
        external_id: yooPayment.id,
      })
      .eq('id', payment.id);

    console.log(`Upgrade payment created: ${payment.id}, YooKassa: ${yooPayment.id}`);

    return jsonResponse({
      paymentId: payment.id,
      confirmationUrl: yooPayment.confirmation?.confirmation_url,
      upgradePrice,
      remainingValue,
    });
  } catch (error) {
    console.error('Error in upgrade-subscription:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    if (message === 'Unauthorized') {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
    
    return jsonResponse({ error: message }, 500);
  }
});
