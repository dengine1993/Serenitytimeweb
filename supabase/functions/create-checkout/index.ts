import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getProductById } from '../_shared/products.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT using getClaims (required for signing-keys system)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ code: 401, message: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.sub) {
      console.error('JWT validation failed:', claimsError);
      return new Response(
        JSON.stringify({ code: 401, message: 'Invalid JWT' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;
    const user = { id: userId, email: userEmail };

    // Create service client for DB operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { product, priceRub } = await req.json();

    // Validate product using dynamic catalog
    const productDef = await getProductById(product);
    if (!productDef) {
      console.error('Invalid product:', product);
      throw new Error('Invalid product');
    }

    const paymentType = productDef.paymentType;
    let amount = priceRub || productDef.amount.value;

    // Apply referral discount for subscription products
    if (productDef.entitlement.kind === 'subscription') {
      const { data: referral } = await supabaseAdmin
        .from('referrals_v2')
        .select('invited_reward_days')
        .eq('invited_user_id', user.id)
        .single();

      // For referral users, apply 30% discount on first payment
      if (referral) {
        // Check if this is first payment
        const { data: firstPayment } = await supabaseAdmin
          .from('payments')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'succeeded')
          .limit(1)
          .maybeSingle();

        if (!firstPayment) {
          // Apply 30% discount for referred users
          const discountPct = 30;
          const discountFactor = 1 - (discountPct / 100);
          amount = Math.round(amount * discountFactor);
          console.log(`Applied ${discountPct}% referral discount: ${priceRub || productDef.amount.value} -> ${amount}`);
        }
      }
    }
    
    const metadata: Record<string, string> = {
      user_id: user.id,
      product
    };

    // Create payment record
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        user_id: user.id,
        product_type: product,
        provider: 'yookassa',
        amount: amount,
        currency: 'RUB',
        status: 'pending'
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    // Create YooKassa payment
    const shopId = Deno.env.get('YOOKASSA_SHOP_ID');
    const secretKey = Deno.env.get('YOOKASSA_SECRET_KEY');
    const idempotenceKey = crypto.randomUUID();

    const FALLBACK_ORIGIN = Deno.env.get('SITE_URL') ?? 'https://preview--serenitylight.lovable.app';
    const origin = req.headers.get('origin') ?? FALLBACK_ORIGIN;

    const yookassaPayload: any = {
      amount: {
        value: amount.toFixed(2),
        currency: 'RUB'
      },
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url: `${origin}/payment/success?payment_id=${payment.id}`
      },
      description: productDef.description,
      metadata
    };

    if (paymentType === 'subscription') {
      yookassaPayload.save_payment_method = true;
    }

    const yookassaResponse = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${shopId}:${secretKey}`)}`,
        'Content-Type': 'application/json',
        'Idempotence-Key': idempotenceKey,
      },
      body: JSON.stringify(yookassaPayload)
    });

    const yookassaData = await yookassaResponse.json();

    if (!yookassaResponse.ok) {
      throw new Error(yookassaData.description || 'YooKassa error');
    }

    // Update payment with YooKassa data
    await supabaseAdmin
      .from('payments')
      .update({
        yookassa_payment_id: yookassaData.id,
        yookassa_confirmation_url: yookassaData.confirmation.confirmation_url,
        meta: { ...payment.meta, yookassa_data: yookassaData }
      })
      .eq('id', payment.id);

    return new Response(
      JSON.stringify({
        paymentId: payment.id,
        confirmationUrl: yookassaData.confirmation.confirmation_url
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in create-checkout:', error);
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
