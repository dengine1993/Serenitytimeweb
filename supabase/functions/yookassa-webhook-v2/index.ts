import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { addMonths } from 'npm:date-fns@3';
import { getSupabaseClient } from '../_shared/db.ts';
import { getProductById, ProductDefinition } from '../_shared/products.ts';
import { sendMail } from '../_shared/smtp.ts';

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
  paymentMethodId?: string | null,
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

  const updateFields: Record<string, unknown> = {
    status: 'active',
    current_period_end: newPeriodEnd.toISOString(),
    billing_interval: billingInterval,
    auto_renew: autoRenew,
    failed_charge_count: 0,
  };
  if (paymentMethodId) {
    updateFields.yookassa_payment_method_id = paymentMethodId;
  }

  if (existingSub) {
    await supabase
      .from('subscriptions')
      .update(updateFields)
      .eq('id', existingSub.id);
  } else {
    await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan: 'premium',
        ...updateFields,
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
      <div class="logo">🌿 Восход</div>
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
      <p>С заботой, команда Восхода 💚</p>
    </div>
  </div>
</body>
</html>`;

  const result = await sendMail({
    to: email,
    subject: 'Оплата прошла успешно — Восход',
    html: emailHtml,
  });

  if (!result.ok) {
    console.error('Email send failed:', result.error);
  } else {
    console.log('Confirmation email sent to:', email);
  }
}

async function grantEntitlement(
  supabase: ReturnType<typeof getSupabaseClient>,
  product: ProductDefinition,
  userId: string,
  paymentMethodId?: string | null,
) {
  switch (product.entitlement.kind) {
    case 'subscription':
      await grantPremiumSubscription(supabase, userId, product.entitlement.intervalMonths, paymentMethodId);
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

  // M5: Idempotency — don't re-grant entitlement on webhook retry
  if (payment.status === 'succeeded') {
    console.log('Payment already processed, skipping:', payment.id);
    return jsonResponse({ ok: true, alreadyProcessed: true });
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

  // C4: Strict amount validation. We trust `payments.amount` (set server-side
  // in create-checkout / upgrade-subscription with applied discounts) over the
  // catalog price, because of legitimate discounts.
  const paymentAmount = paymentObject.amount as { value?: string; currency?: string } | undefined;
  const expectedAmount = Number(payment.amount).toFixed(2);
  const actualAmount = paymentAmount?.value ? Number(paymentAmount.value).toFixed(2) : null;
  const expectedCurrency = (payment.currency || 'RUB').toUpperCase();
  const actualCurrency = (paymentAmount?.currency || '').toUpperCase();

  if (!actualAmount || expectedAmount !== actualAmount || expectedCurrency !== actualCurrency) {
    console.error('Amount mismatch — refusing to grant entitlement', {
      paymentId: payment.id,
      expected: { amount: expectedAmount, currency: expectedCurrency },
      actual: { amount: actualAmount, currency: actualCurrency },
    });
    await markPaymentStatus(supabase, payment.id, 'failed', {
      ...payment.meta,
      reason: 'amount_mismatch',
      expected: { amount: expectedAmount, currency: expectedCurrency },
      actual: { amount: actualAmount, currency: actualCurrency },
      yookassa_event: payload,
    });
    return jsonResponse({ error: 'Amount mismatch' }, 400);
  }

  await markPaymentStatus(supabase, payment.id, 'succeeded', {
    ...payment.meta,
    productId: product.id,
    expectedAmount: product.amount,
    yookassa_event: payload,
  });

  // Capture payment_method.id for future recurring charges (subscription products).
  // YooKassa возвращает payment_method.saved=true только для платежа, который сам
  // создал «сохранённый» способ оплаты (первая транзакция с save_payment_method:true).
  // На последующих рекуррентных списаниях saved=false, но id остаётся валидным.
  // Поэтому для подписок мы доверяем самому наличию payment_method.id и сохраняем его —
  // это нужно, чтобы subscription-charge-recurrent смог продлить подписку через год/месяц.
  const paymentMethod = paymentObject.payment_method as { id?: string; saved?: boolean; type?: string } | undefined;
  const paymentMethodId =
    product.entitlement.kind === 'subscription' && paymentMethod?.id
      ? paymentMethod.id
      : null;

  if (product.entitlement.kind === 'subscription') {
    console.log('[webhook] subscription payment_method:', {
      hasId: !!paymentMethod?.id,
      saved: paymentMethod?.saved,
      type: paymentMethod?.type,
      willStore: !!paymentMethodId,
    });
  }

  await grantEntitlement(supabase, product, payment.user_id, paymentMethodId);


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

async function verifyHmac(rawBody: string, headerSig: string | null, secret: string): Promise<boolean> {
  if (!headerSig) return false;
  // YooKassa формат: "sha256=<hex>"
  const expectedHex = headerSig.startsWith('sha256=') ? headerSig.slice(7) : headerSig;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
  const computedHex = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  // Constant-time comparison
  if (computedHex.length !== expectedHex.length) return false;
  let diff = 0;
  for (let i = 0; i < computedHex.length; i++) {
    diff |= computedHex.charCodeAt(i) ^ expectedHex.charCodeAt(i);
  }
  return diff === 0;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();

    // M4: HMAC signature check (preferred) — falls back to IP whitelist if secret not configured
    const webhookSecret = Deno.env.get('YOOKASSA_WEBHOOK_SECRET');
    if (webhookSecret) {
      const sig = req.headers.get('content-hmac') || req.headers.get('x-content-hmac');
      const valid = await verifyHmac(rawBody, sig, webhookSecret);
      if (!valid) {
        console.error('HMAC signature mismatch');
        return jsonResponse({ error: 'Invalid signature' }, 403);
      }
    } else {
      const clientIp = getClientIp(req);
      if (!isYooKassaIp(clientIp)) {
        console.error('Unauthorized IP address:', clientIp);
        return jsonResponse({ error: 'Unauthorized' }, 403);
      }
    }

    const supabase = getSupabaseClient();
    const payload = JSON.parse(rawBody);
    console.log('YooKassa webhook received:', JSON.stringify(payload));

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
