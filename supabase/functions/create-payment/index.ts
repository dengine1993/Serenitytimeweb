import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSupabaseClient } from "../_shared/db.ts";
import { getProductById } from "../_shared/products.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getSupabaseClient();

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const body = await req.json();
    const { productId, returnUrl, clientMetadata } = body as {
      productId?: string;
      returnUrl?: string;
      clientMetadata?: Record<string, unknown>;
    };

    if (!productId || typeof productId !== 'string') {
      throw new Error('productId is required');
    }

    const product = await getProductById(productId);
    if (!product) {
      throw new Error('Unknown product');
    }

    // Create YooKassa payment
    const shopId = Deno.env.get('YOOKASSA_SHOP_ID');
    const secretKey = Deno.env.get('YOOKASSA_SECRET_KEY');

    if (!shopId || !secretKey) {
      throw new Error('YooKassa credentials not configured');
    }

    const auth = btoa(`${shopId}:${secretKey}`);
    const idempotenceKey = crypto.randomUUID();

    const FALLBACK_ORIGIN = Deno.env.get('SITE_URL') ?? 'https://preview--serenitylight.lovable.app';
    const originHeader = req.headers.get('origin');
    const resolvedReturnUrl = typeof returnUrl === 'string' && returnUrl.length > 0
      ? returnUrl
      : `${originHeader ?? FALLBACK_ORIGIN}/premium?payment=success`;

    const amountValue = product.amount.value.toFixed(2);
    const yookassaPayload = {
      amount: {
        value: amountValue,
        currency: product.amount.currency
      },
      confirmation: {
        type: 'redirect',
        return_url: resolvedReturnUrl
      },
      capture: true,
      description: product.description,
      metadata: {
        userId: user.id,
        productId: product.id,
        expectedAmount: amountValue,
        currency: product.amount.currency
      }
    };

    console.log('Creating YooKassa payment:', {
      productId: product.id,
      amount: amountValue,
      userId: user.id,
    });

    const yookassaResponse = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
        'Idempotence-Key': idempotenceKey
      },
      body: JSON.stringify(yookassaPayload)
    });

    if (!yookassaResponse.ok) {
      const errorText = await yookassaResponse.text();
      console.error('YooKassa error:', errorText);
      throw new Error(`YooKassa API error: ${errorText}`);
    }

    const payment = await yookassaResponse.json();

    console.log('YooKassa payment created:', payment.id);

    const metadata = {
      productId: product.id,
      expectedAmount: product.amount.value,
      currency: product.amount.currency,
      clientMetadata: clientMetadata && typeof clientMetadata === 'object' ? clientMetadata : undefined,
      description: product.description,
    };

    const { error: dbError } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        amount: product.amount.value,
        currency: product.amount.currency,
        status: 'pending',
        payment_type: product.paymentType,
        product: product.id,
        yookassa_payment_id: payment.id,
        yookassa_confirmation_url: payment.confirmation.confirmation_url,
        metadata,
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    return new Response(
      JSON.stringify({
        url: payment.confirmation.confirmation_url,
        paymentId: payment.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error('Error in create-payment:', error);
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