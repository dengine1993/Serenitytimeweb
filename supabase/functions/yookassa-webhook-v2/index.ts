import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { addMonths } from 'npm:date-fns@3';
import { getSupabaseClient } from '../_shared/db.ts';
import { getProductById, ProductDefinition } from '../_shared/products.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// YooKassa allowed IP ranges for webhook verification
// https://yookassa.ru/developers/using-api/webhooks#ip
const YOOKASSA_IP_RANGES = [
  '185.71.76.0/27',
  '185.71.77.0/27',
  '77.75.153.0/25',
  '77.75.156.11',
  '77.75.156.35',
  '77.75.154.128/25',
];

function ipToNumber(ip: string): number {
  const parts = ip.split('.').map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function isIpInCidr(ip: string, cidr: string): boolean {
  if (!cidr.includes('/')) {
    return ip === cidr;
  }
  const [range, bits] = cidr.split('/');
  const mask = ~((1 << (32 - parseInt(bits))) - 1) >>> 0;
  return (ipToNumber(ip) & mask) === (ipToNumber(range) & mask);
}

function isYooKassaIp(ip: string): boolean {
  // Skip validation in development or if IP is not available
  if (!ip || ip === '127.0.0.1' || ip === '::1') {
    console.warn('Skipping IP validation for local/missing IP:', ip);
    return true;
  }
  return YOOKASSA_IP_RANGES.some(range => isIpInCidr(ip, range));
}

function getClientIp(req: Request): string {
  // Check common headers for real IP behind proxy
  const xForwardedFor = req.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  const xRealIp = req.headers.get('x-real-ip');
  if (xRealIp) {
    return xRealIp;
  }
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  return '';
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function formatAmount(value: number): string {
  return value.toFixed(2);
}

export function amountsMatch(
  product: ProductDefinition,
  paymentAmount?: { value?: string; currency?: string },
): boolean {
  if (!paymentAmount?.value || !paymentAmount.currency) return false;
  const expectedValue = formatAmount(product.amount.value);
  const actualValue = Number(paymentAmount.value).toFixed(2);
  return (
    expectedValue === actualValue &&
    paymentAmount.currency.toUpperCase() === product.amount.currency.toUpperCase()
  );
}

async function markPaymentStatus(
  supabase: ReturnType<typeof getSupabaseClient>,
  paymentId: string,
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled' | 'failed' | 'refunded',
  meta: Record<string, unknown>,
) {
  const updateData: Record<string, unknown> = {
    status,
    meta,
  };

  if (status === 'succeeded') {
    updateData.confirmed_at = new Date().toISOString();
  }

  await supabase
    .from('payments')
    .update(updateData)
    .eq('id', paymentId);
}

export async function grantPremiumSubscription(
  supabase: ReturnType<typeof getSupabaseClient>,
  userId: string,
  intervalMonths: number,
) {
  const billingInterval = intervalMonths >= 12 ? 'year' : 'month';
  const autoRenew = billingInterval === 'month';

  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('plan', 'premium')
    .maybeSingle();

  const baseDate = existingSub?.current_period_end
    ? new Date(existingSub.current_period_end)
    : new Date();
  const newPeriodEnd = addMonths(baseDate, intervalMonths);

  if (existingSub) {
    await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        current_period_end: newPeriodEnd.toISOString(),
        billing_interval: billingInterval,
        auto_renew: autoRenew,
      })
      .eq('id', existingSub.id);
  } else {
    await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan: 'premium',
        status: 'active',
        current_period_end: newPeriodEnd.toISOString(),
        billing_interval: billingInterval,
        auto_renew: autoRenew,
      });
  }

  const { data: referral } = await supabase
    .from('referrals_v2')
    .select('inviter_user_id, inviter_reward_days')
    .eq('invited_user_id', userId)
    .maybeSingle();

  if (referral?.inviter_user_id && referral.inviter_reward_days) {
    const { data: inviterSub } = await supabase
      .from('subscriptions')
      .select('current_period_end')
      .eq('user_id', referral.inviter_user_id)
      .eq('plan', 'premium')
      .maybeSingle();

    if (inviterSub?.current_period_end) {
      const inviterNewEnd = new Date(inviterSub.current_period_end);
      inviterNewEnd.setDate(inviterNewEnd.getDate() + referral.inviter_reward_days);

      await supabase
        .from('subscriptions')
        .update({ current_period_end: inviterNewEnd.toISOString() })
        .eq('user_id', referral.inviter_user_id)
        .eq('plan', 'premium');
    }
  }
}

async function grantJivaExtraSession(
  supabase: ReturnType<typeof getSupabaseClient>,
  userId: string,
  quantity: number,
) {
  const sessions = Array.from({ length: quantity }).map(() => ({
    user_id: userId,
    type: 'extra',
    status: 'available',
  }));

  await supabase.from('jiva_sessions_v2').insert(sessions);
}



async function sendPaymentConfirmationEmail(
  supabase: ReturnType<typeof getSupabaseClient>,
  userId: string,
  productName: string,
  amount: string,
) {
  const UNISENDER_API_KEY = Deno.env.get('UNISENDER_GO_API_KEY');
  if (!UNISENDER_API_KEY) {
    console.log('UNISENDER_GO_API_KEY not set, skipping email');
    return;
  }

  const { data: authUser } = await supabase.auth.admin.getUserById(userId);
  const email = authUser?.user?.email;
  if (!email) {
    console.log('No email found for user:', userId);
    return;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('user_id', userId)
    .maybeSingle();

  const userName = profile?.display_name || 'Друг';

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #6366f1; }
    .content { background: #f8fafc; border-radius: 12px; padding: 24px; }
    .success { color: #22c55e; font-size: 48px; text-align: center; }
    .amount { font-size: 24px; font-weight: bold; color: #6366f1; }
    .footer { text-align: center; color: #94a3b8; font-size: 14px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🌿 Безмятежные</div>
    </div>
    <div class="content">
      <div class="success">✓</div>
      <h2 style="text-align: center;">Оплата прошла успешно!</h2>
      <p>Привет, ${userName}! 👋</p>
      <p>Благодарим за покупку <strong>${productName}</strong>!</p>
      <p>Сумма: <span class="amount">${amount} ₽</span></p>
      <p>Ваша подписка уже активирована — можете пользоваться всеми возможностями прямо сейчас.</p>
    </div>
    <div class="footer">
      <p>С заботой, команда Безмятежных 💚</p>
    </div>
  </div>
</body>
</html>`;

  const response = await fetch('https://go2.unisender.ru/ru/transactional/api/v1/email/send.json', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': UNISENDER_API_KEY,
    },
    body: JSON.stringify({
      message: {
        recipients: [{ email }],
        body: { html: emailHtml },
        subject: 'Оплата прошла успешно — Безмятежные',
        from_email: 'noreply@serenitypeople.ru',
        from_name: 'Безмятежные',
      },
    }),
  });

  if (!response.ok) {
    console.error('Email send failed:', await response.text());
  } else {
    console.log('Confirmation email sent to:', email);
  }
}

async function grantEntitlement(
  supabase: ReturnType<typeof getSupabaseClient>,
  product: ProductDefinition,
  userId: string,
) {
  switch (product.entitlement.kind) {
    case 'subscription':
      await grantPremiumSubscription(supabase, userId, product.entitlement.intervalMonths);
      return;
    case 'jiva_extra':
      await grantJivaExtraSession(supabase, userId, product.entitlement.quantity);
      return;
    default:
      console.warn('[yookassa-webhook] Unknown entitlement', product.entitlement);
  }
}


// Handler for payment.succeeded event
async function handlePaymentSucceeded(
  supabase: ReturnType<typeof getSupabaseClient>,
  paymentObject: Record<string, unknown>,
  payload: Record<string, unknown>,
) {
  const yookassaPaymentId = paymentObject.id as string;

  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('*')
    .eq('yookassa_payment_id', yookassaPaymentId)
    .single();

  if (paymentError || !payment) {
    console.error('Payment not found:', yookassaPaymentId);
    throw new Error('Payment not found');
  }

  const metadata = (paymentObject.metadata || {}) as Record<string, string>;
  const productId = metadata.product || payment.product_type;
  if (!productId) {
    console.error('Missing productId in metadata');
    await markPaymentStatus(supabase, payment.id, 'failed', {
      ...payment.meta,
      reason: 'missing_product',
      yookassa_event: payload,
    });
    return jsonResponse({ error: 'Unknown product' }, 400);
  }

  const product = await getProductById(productId);
  if (!product) {
    console.error('Product not found in catalog:', productId);
    await markPaymentStatus(supabase, payment.id, 'failed', {
      ...payment.meta,
      reason: 'unknown_product',
      productId,
      yookassa_event: payload,
    });
    return jsonResponse({ error: 'Unknown product' }, 400);
  }

  // Soft check for amount - log warning but continue (may be referral discount)
  const paymentAmount = paymentObject.amount as { value?: string; currency?: string } | undefined;
  if (!amountsMatch(product, paymentAmount)) {
    console.warn('Amount mismatch for payment (may be referral discount)', {
      paymentId: payment.id,
      expected: product.amount,
      actual: paymentAmount,
    });
    // Continue processing - don't fail on amount mismatch due to discounts
  }

  await markPaymentStatus(supabase, payment.id, 'succeeded', {
    ...payment.meta,
    productId: product.id,
    expectedAmount: product.amount,
    yookassa_event: payload,
  });

  await grantEntitlement(supabase, product, payment.user_id);


  // Send confirmation email
  try {
    await sendPaymentConfirmationEmail(supabase, payment.user_id, product.description, paymentAmount?.value || String(payment.amount));
  } catch (emailErr) {
    console.error('Failed to send confirmation email:', emailErr);
  }

  console.log('Payment processed successfully:', payment.id, 'product:', product.id);
  return jsonResponse({ ok: true });
}

// Handler for payment.waiting_for_capture event
async function handlePaymentWaitingForCapture(
  supabase: ReturnType<typeof getSupabaseClient>,
  paymentObject: Record<string, unknown>,
  payload: Record<string, unknown>,
) {
  const yookassaPaymentId = paymentObject.id as string;

  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('yookassa_payment_id', yookassaPaymentId)
    .maybeSingle();

  if (payment) {
    await markPaymentStatus(supabase, payment.id, 'waiting_for_capture', {
      ...payment.meta,
      yookassa_event: payload,
    });
  }

  console.log('Payment waiting for capture:', yookassaPaymentId);
  return jsonResponse({ ok: true });
}

// Handler for payment.canceled event
async function handlePaymentCanceled(
  supabase: ReturnType<typeof getSupabaseClient>,
  paymentObject: Record<string, unknown>,
  payload: Record<string, unknown>,
) {
  const yookassaPaymentId = paymentObject.id as string;

  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('yookassa_payment_id', yookassaPaymentId)
    .maybeSingle();

  if (payment) {
    const cancellationDetails = paymentObject.cancellation_details as Record<string, unknown> | undefined;
    await markPaymentStatus(supabase, payment.id, 'canceled', {
      ...payment.meta,
      cancellation_details: cancellationDetails,
      yookassa_event: payload,
    });
  }

  console.log('Payment canceled:', yookassaPaymentId);
  return jsonResponse({ ok: true });
}

// Handler for refund.succeeded event
async function handleRefundSucceeded(
  supabase: ReturnType<typeof getSupabaseClient>,
  refundObject: Record<string, unknown>,
  payload: Record<string, unknown>,
) {
  const yookassaPaymentId = refundObject.payment_id as string;

  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('yookassa_payment_id', yookassaPaymentId)
    .maybeSingle();

  if (!payment) {
    console.warn('Payment not found for refund:', yookassaPaymentId);
    return jsonResponse({ ok: true });
  }

  await markPaymentStatus(supabase, payment.id, 'refunded', {
    ...payment.meta,
    refund: refundObject,
    yookassa_event: payload,
  });

  // TODO: Optionally revoke entitlements here if needed
  console.log('Refund processed for payment:', payment.id);
  return jsonResponse({ ok: true });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate request is from YooKassa
    const clientIp = getClientIp(req);
    if (!isYooKassaIp(clientIp)) {
      console.error('Unauthorized IP address:', clientIp);
      return jsonResponse({ error: 'Unauthorized' }, 403);
    }

    const supabase = getSupabaseClient();
    const payload = await req.json();
    console.log('YooKassa webhook received from IP', clientIp, ':', JSON.stringify(payload));

    const { event, object: eventObject } = payload;

    switch (event) {
      case 'payment.waiting_for_capture':
        return await handlePaymentWaitingForCapture(supabase, eventObject, payload);

      case 'payment.succeeded':
        return await handlePaymentSucceeded(supabase, eventObject, payload);

      case 'payment.canceled':
        return await handlePaymentCanceled(supabase, eventObject, payload);

      case 'refund.succeeded':
        return await handleRefundSucceeded(supabase, eventObject, payload);

      default:
        console.log('Ignoring unhandled event:', event);
        return jsonResponse({ ok: true });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ error: errorMessage }, 500);
  }
});
