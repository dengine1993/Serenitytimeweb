import { createClient } from 'npm:@supabase/supabase-js@2';
import { sanitizeSearch } from '../_shared/admin.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Tables admins are NEVER allowed to bulk-delete from (read-only via UI)
const PROTECTED_TABLES = new Set([
  'profiles', 'subscriptions', 'payments', 'user_roles', 'admin_logs', 'consent_log',
]);

// Whitelist of tables admins are allowed to inspect
const ALLOWED_TABLES = new Set([
  // Контент
  'posts', 'post_comments', 'post_reactions',
  'community_messages', 'message_reactions', 'message_read_receipts',
  'pinned_community_messages', 'pinned_moments',
  // Платежи
  'subscriptions', 'payments',
  // Модерация
  'post_reports', 'comment_reports', 'message_reports', 'moderation_history',
  // AI / Usage
  'ai_chats', 'ai_messages', 'llm_usage', 'feature_usage',
  'jiva_memory_chunks', 'jiva_sessions_v2',
  'training_examples', 'trial_events', 'trial_messages', 'trial_sessions',
  // Дневник / Кризис
  'mood_entries', 'emotion_calendar', 'daily_checkins',
  'crisis_sessions', 'art_therapy_sessions',
  // Личные чаты
  'private_conversations', 'private_messages', 'private_chat_requests',
  'friendships',
  // Профили / Auth
  'profiles', 'user_roles', 'community_rules_accepted', 'consent_log',
  // Сториз
  'story_comment_reactions', 'story_comments', 'story_reactions',
  // Система
  'admin_logs', 'admin_settings', 'app_config',
  'notifications', 'notification_preferences', 'push_subscriptions',
  'system_notifications', 'referrals_v2',
]);

function ident(name: string): string {
  // Postgres identifier escaping
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid identifier: ${name}`);
  }
  return `"${name}"`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claims.claims.sub as string;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify admin role
    const { data: roleRow } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin role required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const mode = body.mode as string;

    // ----- LIST TABLES -----
    if (mode === 'list_tables') {
      const tables = Array.from(ALLOWED_TABLES);
      // Get exact counts in parallel using head:true count
      const counts = await Promise.all(
        tables.map(async (t) => {
          try {
            const { count } = await admin.from(t).select('*', { count: 'exact', head: true });
            return [t, count ?? 0] as const;
          } catch {
            return [t, 0] as const;
          }
        })
      );
      return new Response(JSON.stringify({ tables: Object.fromEntries(counts) }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ----- GET SCHEMA -----
    if (mode === 'get_schema') {
      const table = body.table as string;
      if (!ALLOWED_TABLES.has(table)) {
        return new Response(JSON.stringify({ error: 'Table not allowed' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Use information_schema via RPC — works for empty tables too.
      const { data: schemaRows, error: schemaErr } = await admin
        .rpc('get_table_columns', { p_table: table });
      if (schemaErr) throw schemaErr;

      const mapType = (dataType: string): string => {
        const t = (dataType || '').toLowerCase();
        if (t === 'boolean') return 'boolean';
        if (t === 'jsonb' || t === 'json') return 'json';
        if (t === 'uuid') return 'uuid';
        if (t.includes('timestamp') || t === 'date' || t === 'time') return 'date';
        if (t === 'integer' || t === 'bigint' || t === 'smallint' || t === 'numeric' || t === 'real' || t === 'double precision') return 'number';
        return 'text';
      };

      const columns = (schemaRows ?? []).map((c: { column_name: string; data_type: string }) => ({
        key: c.column_name,
        data_type: mapType(c.data_type),
        is_pk: c.column_name === 'id',
      }));

      return new Response(JSON.stringify({ columns, pk: 'id' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ----- QUERY -----
    if (mode === 'query') {
      const table = body.table as string;
      if (!ALLOWED_TABLES.has(table)) {
        return new Response(JSON.stringify({ error: 'Table not allowed' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const page = Math.max(1, Number(body.page) || 1);
      const pageSize = Math.min(200, Math.max(1, Number(body.pageSize) || 50));
      const search = (body.search as string | undefined)?.trim() || '';
      const sortKey = body.sortKey as string | undefined;
      const sortDir = body.sortDir === 'asc' ? 'asc' : 'desc';

      // Determine sort column: prefer requested, fallback to created_at, else PK
      // Get a sample row to know which columns exist
      const { data: sampleRows } = await admin.from(table).select('*').limit(1);
      const sample = sampleRows?.[0] ?? {};
      const cols = Object.keys(sample);
      let orderCol = sortKey && cols.includes(sortKey) ? sortKey
        : cols.includes('created_at') ? 'created_at'
        : cols.includes('updated_at') ? 'updated_at'
        : cols[0] || 'id';

      let q = admin.from(table).select('*', { count: 'exact' });

      if (search && cols.length) {
        // Build OR ilike on text-like columns
        const textCols = Object.entries(sample).filter(([_, v]) => typeof v === 'string').map(([k]) => k);
        const safe = sanitizeSearch(search);
        if (textCols.length && safe) {
          const orExpr = textCols.map((c) => `${c}.ilike.%${safe}%`).join(',');
          q = q.or(orExpr);
        }
      }

      q = q.order(orderCol, { ascending: sortDir === 'asc' })
           .range((page - 1) * pageSize, page * pageSize - 1);

      const { data, count, error } = await q;
      if (error) throw error;

      return new Response(JSON.stringify({ data: data ?? [], count: count ?? 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ----- DELETE -----
    if (mode === 'delete') {
      const table = body.table as string;
      const ids = body.ids as string[];
      if (!ALLOWED_TABLES.has(table)) {
        return new Response(JSON.stringify({ error: 'Table not allowed' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (PROTECTED_TABLES.has(table)) {
        return new Response(JSON.stringify({ error: `Удаление из таблицы "${table}" запрещено через интерфейс` }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!Array.isArray(ids) || ids.length === 0) {
        return new Response(JSON.stringify({ error: 'No ids provided' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await admin.from(table).delete().in('id', ids);
      if (error) throw error;

      await admin.from('admin_logs').insert({
        admin_id: userId,
        action: 'database_delete',
        target_type: table,
        details: { ids, count: ids.length },
      });

      return new Response(JSON.stringify({ success: true, deleted: ids.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown mode' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[admin-database] error:', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
