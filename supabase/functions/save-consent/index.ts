// Server-side immutable consent log (152-ФЗ + 63-ФЗ).
// Принимает массив согласий, валидирует JWT, извлекает IP/User-Agent на
// сервере (надёжнее ipify) и пишет пачку в consent_log через service role.
// Параллельно обновляет денормализованные поля в profiles для обратной
// совместимости со старыми отчётами.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ConsentType =
  | 'offer'
  | 'privacy'
  | 'immediate_service'
  | 'disclaimer'
  | 'special_category'
  | 'age_16plus'
  | 'name_to_jiva'
  | 'cross_border'
  | 'cookies'
  | 'consent';

const ALLOWED_TYPES: ConsentType[] = [
  'offer', 'privacy', 'immediate_service', 'disclaimer',
  'special_category', 'age_16plus', 'name_to_jiva',
  'cross_border', 'cookies', 'consent',
];

const ALLOWED_CONTEXTS = ['registration', 'payment_premium', 'payment_topup', 'reconsent', 'settings'];
const ALLOWED_ACTIONS = ['accepted', 'withdrawn'];

interface ConsentInput {
  type: ConsentType;
  version: string;
  context: string;
  action?: 'accepted' | 'withdrawn';
  paymentId?: string;
}

function getClientIp(req: Request): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf;
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Поддерживаем два формата:
    //   1) batch:  { consents: [{type, version, context, action?, paymentId?}, ...] }
    //   2) legacy: { consent_type, version, ip? }  — для старых клиентов
    let consents: ConsentInput[] = [];
    if (Array.isArray(body.consents)) {
      consents = body.consents;
    } else if (body.consent_type && body.version) {
      consents = [{
        type: body.consent_type,
        version: body.version,
        context: body.context || 'registration',
        action: 'accepted',
      }];
    } else {
      return new Response(
        JSON.stringify({ error: 'Expected `consents` array or legacy `consent_type`+`version`' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (consents.length === 0 || consents.length > 20) {
      return new Response(
        JSON.stringify({ error: 'consents must contain 1..20 items' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Валидация
    for (const c of consents) {
      if (!ALLOWED_TYPES.includes(c.type)) {
        return new Response(
          JSON.stringify({ error: `Invalid consent type: ${c.type}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (!c.version || typeof c.version !== 'string' || c.version.length > 100) {
        return new Response(
          JSON.stringify({ error: 'version is required (string, <=100 chars)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (!ALLOWED_CONTEXTS.includes(c.context)) {
        return new Response(
          JSON.stringify({ error: `Invalid context: ${c.context}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (c.action && !ALLOWED_ACTIONS.includes(c.action)) {
        return new Response(
          JSON.stringify({ error: `Invalid action: ${c.action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const ip = getClientIp(req);
    const userAgent = req.headers.get('user-agent')?.slice(0, 1000) || null;
    const now = new Date().toISOString();

    // 1) Иммутабельная запись в журнал
    const rows = consents.map((c) => ({
      user_id: user.id,
      consent_type: c.type,
      document_version: c.version,
      action: c.action || 'accepted',
      context: c.context,
      ip_address: ip,
      user_agent: userAgent,
      payment_id: c.paymentId || null,
    }));

    const { error: insertError } = await supabaseClient.from('consent_log').insert(rows);
    if (insertError) {
      console.error('consent_log insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to write consent log' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2) Денормализация в profiles (обратная совместимость)
    const profileUpdate: Record<string, unknown> = {};
    for (const c of consents) {
      if (c.action === 'withdrawn') continue;
      switch (c.type) {
        case 'offer':
          profileUpdate.offer_accepted_at = now;
          profileUpdate.offer_version = c.version;
          break;
        case 'privacy':
          profileUpdate.privacy_accepted_at = now;
          profileUpdate.privacy_version = c.version;
          break;
        case 'immediate_service':
          profileUpdate.immediate_service_accepted_at = now;
          profileUpdate.immediate_service_version = c.version;
          break;
        case 'disclaimer':
          profileUpdate.disclaimer_accepted_at = now;
          profileUpdate.disclaimer_version = c.version;
          break;
      }
    }
    if (ip) profileUpdate.consent_ip = ip;

    if (Object.keys(profileUpdate).length > 0) {
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update(profileUpdate)
        .eq('user_id', user.id);
      if (updateError) {
        // Не критично для иммутабельного журнала — логируем и продолжаем
        console.warn('profiles denormalization update failed:', updateError);
      }
    }

    console.log(`save-consent: user=${user.id} wrote=${rows.length}`);

    return new Response(
      JSON.stringify({ success: true, written: rows.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in save-consent:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
