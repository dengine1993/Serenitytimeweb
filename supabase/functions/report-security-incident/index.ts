// Edge function: report-security-incident
// 152-ФЗ: создание инцидента ПДн + email-уведомление администратору
// Получатель: info@newdawnjourney.com через собственный SMTP на Timeweb VPS.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { sendMail } from '../_shared/smtp.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_EMAIL = 'info@newdawnjourney.com';
const APP_NAME = 'Восход';
const RKN_FORM_URL = 'https://pd.rkn.gov.ru/incidents/';

interface IncidentBody {
  incident_type: 'data_leak' | 'unauthorized_access' | 'system_compromise' | 'auto_detected' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description?: string;
  affected_users_count?: number;
  discovered_at?: string;
}

const SEVERITY_LABEL: Record<string, string> = {
  low: '🟢 Низкая',
  medium: '🟡 Средняя',
  high: '🟠 Высокая',
  critical: '🔴 Критическая',
};

const TYPE_LABEL: Record<string, string> = {
  data_leak: 'Утечка данных',
  unauthorized_access: 'Несанкционированный доступ',
  system_compromise: 'Компрометация системы',
  auto_detected: 'Автодетект',
  other: 'Другое',
};

function buildEmailHtml(inc: {
  id: string;
  incident_type: string;
  severity: string;
  title: string;
  description?: string;
  affected_users_count?: number;
  discovered_at: string;
  created_by_email?: string;
}): string {
  const sevLabel = SEVERITY_LABEL[inc.severity] ?? inc.severity;
  const typeLabel = TYPE_LABEL[inc.incident_type] ?? inc.incident_type;
  const adminLink = `https://newdawnjourney.com/admin/incidents`;

  return `
<!DOCTYPE html>
<html lang="ru"><body style="font-family:-apple-system,Arial,sans-serif;background:#f6f7f9;margin:0;padding:24px;color:#1a1a1a;">
  <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,.06);">
    <div style="background:#dc2626;color:#fff;padding:20px 24px;">
      <h1 style="margin:0;font-size:20px;">🚨 Инцидент ПДн — ${APP_NAME}</h1>
      <p style="margin:6px 0 0;opacity:.9;font-size:13px;">152-ФЗ требует уведомить РКН в течение 24 часов</p>
    </div>
    <div style="padding:24px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:6px 0;color:#666;width:160px;">Тип:</td><td><b>${typeLabel}</b></td></tr>
        <tr><td style="padding:6px 0;color:#666;">Серьёзность:</td><td><b>${sevLabel}</b></td></tr>
        <tr><td style="padding:6px 0;color:#666;">Затронуто пользователей:</td><td>${inc.affected_users_count ?? 0}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Обнаружено:</td><td>${new Date(inc.discovered_at).toLocaleString('ru-RU')}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Создал:</td><td>${inc.created_by_email ?? 'system'}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">ID инцидента:</td><td style="font-family:monospace;font-size:12px;">${inc.id}</td></tr>
      </table>

      <h3 style="margin:20px 0 8px;font-size:16px;">${escapeHtml(inc.title)}</h3>
      ${inc.description ? `<p style="white-space:pre-wrap;color:#333;line-height:1.5;">${escapeHtml(inc.description)}</p>` : ''}

      <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:14px 16px;margin:24px 0;border-radius:6px;">
        <b style="color:#92400e;">Чек-лист первых 24 часов:</b>
        <ol style="margin:8px 0 0 18px;padding:0;color:#78350f;font-size:13px;line-height:1.6;">
          <li>Локализовать инцидент: остановить утечку, заблокировать доступ.</li>
          <li>Зафиксировать факты, сохранить логи.</li>
          <li>Подать форму в РКН: <a href="${RKN_FORM_URL}" style="color:#92400e;">${RKN_FORM_URL}</a></li>
          <li>В течение 72 часов — отчёт о результатах расследования.</li>
          <li>Обновить статус инцидента в админке после уведомления РКН.</li>
        </ol>
      </div>

      <div style="text-align:center;margin-top:24px;">
        <a href="${adminLink}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">Открыть в админке</a>
      </div>
    </div>
    <div style="padding:14px 24px;background:#f6f7f9;color:#666;font-size:11px;text-align:center;">
      Это автоматическое уведомление от системы compliance ${APP_NAME}. Не отвечайте на это письмо.
    </div>
  </div>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

async function sendIncidentEmail(html: string, subject: string): Promise<{ ok: boolean; error?: string }> {
  return await sendMail({
    to: ADMIN_EMAIL,
    subject,
    html,
    fromName: `${APP_NAME} Compliance`,
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Auth: must be admin (or service_role via internal secret)
    const authHeader = req.headers.get('Authorization');
    const internalSecret = req.headers.get('x-internal-secret');
    let createdBy: string | null = null;
    let createdByEmail: string | undefined;

    const isInternal = internalSecret && internalSecret === Deno.env.get('INTERNAL_FUNCTION_SECRET');

    if (!isInternal) {
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const token = authHeader.replace('Bearer ', '').trim();
      const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
      if (claimsErr || !claims?.claims) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      createdBy = claims.claims.sub as string;
      createdByEmail = claims.claims.email as string | undefined;

      const { data: roleRow } = await supabase
        .from('user_roles').select('role').eq('user_id', createdBy).eq('role', 'admin').maybeSingle();
      if (!roleRow) {
        return new Response(JSON.stringify({ error: 'Forbidden: admin only' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const body = await req.json() as IncidentBody;

    // Validation
    if (!body.title || body.title.length < 3 || body.title.length > 200) {
      return new Response(JSON.stringify({ error: 'Invalid title (3..200 chars)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const validSev = ['low', 'medium', 'high', 'critical'];
    const validType = ['data_leak', 'unauthorized_access', 'system_compromise', 'auto_detected', 'other'];
    if (!validSev.includes(body.severity)) {
      return new Response(JSON.stringify({ error: 'Invalid severity' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!validType.includes(body.incident_type)) {
      return new Response(JSON.stringify({ error: 'Invalid incident_type' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const discoveredAt = body.discovered_at ?? new Date().toISOString();

    const { data: inserted, error: insErr } = await supabase
      .from('security_incidents')
      .insert({
        incident_type: body.incident_type,
        severity: body.severity,
        title: body.title.slice(0, 200),
        description: body.description?.slice(0, 5000) ?? null,
        affected_users_count: Math.max(0, Math.min(body.affected_users_count ?? 0, 1_000_000)),
        discovered_at: discoveredAt,
        created_by: createdBy,
      })
      .select()
      .single();

    if (insErr || !inserted) {
      console.error('[incident] insert failed', insErr);
      return new Response(JSON.stringify({ error: 'Insert failed', details: insErr?.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send email to admin
    const subject = `🚨 Инцидент ПДн ${SEVERITY_LABEL[body.severity]} — ${APP_NAME}: ${body.title.slice(0, 80)}`;
    const html = buildEmailHtml({
      id: inserted.id,
      incident_type: body.incident_type,
      severity: body.severity,
      title: body.title,
      description: body.description,
      affected_users_count: body.affected_users_count,
      discovered_at: discoveredAt,
      created_by_email: createdByEmail,
    });
    const emailResult = await sendIncidentEmail(html, subject);

    // Audit log
    await supabase.from('pdn_audit_log').insert({
      user_id: createdBy,
      event_type: 'incident_created',
      event_data: {
        incident_id: inserted.id,
        severity: body.severity,
        type: body.incident_type,
        email_sent: emailResult.ok,
        email_error: emailResult.error,
      },
    });

    return new Response(
      JSON.stringify({ success: true, incident: inserted, email_sent: emailResult.ok, email_error: emailResult.error }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('[incident] fatal', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
