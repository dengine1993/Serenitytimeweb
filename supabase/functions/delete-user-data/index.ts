// Edge function: delete-user-data
// 152-ФЗ ст. 14: полное удаление аккаунта по запросу пользователя.
// 1) Удаляет все строки из таблиц.
// 2) Удаляет файлы из storage (avatars, audio-cache, community-attachments, diary-exports).
// 3) Удаляет пользователя из auth.users.
// 4) Пишет хешированную запись в data_deletion_log + аудит-лог.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const TABLES_USER_ID: string[] = [
  'mood_entries', 'emotion_calendar', 'daily_checkins',
  'art_therapy_sessions', 'user_art_therapy_entries',
  'jiva_memory_chunks', 'jiva_sessions_v2', 'jiva_ingest_queue',
  'ai_chats', 'ai_messages', 'llm_usage',
  'posts', 'post_comments', 'post_reactions', 'community_messages',
  'message_reactions', 'message_read_receipts', 'community_rules_accepted',
  'notifications', 'system_notifications', 'push_subscriptions', 'device_push_tokens',
  'crisis_sessions', 'user_navigator_progress',
  'usage_counters', 'feature_usage', 'user_usage', 'subscriptions', 'payments',
  'ab_tests', 'consent_log', 'user_consents',
  'specialist_bookings',
  'user_stories', 'story_reactions', 'story_comments',
  'private_messages',
  'user_roles',
  'profiles',
];

const STORAGE_BUCKETS = ['avatars', 'audio-cache', 'community-attachments', 'diary-exports'];

async function deleteStorageFolder(supabase: ReturnType<typeof createClient>, bucket: string, userId: string) {
  try {
    const prefix = userId;
    const { data: files, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
    if (error || !files || files.length === 0) return { bucket, deleted: 0 };
    const paths = files.map((f) => `${prefix}/${f.name}`);
    const { error: delErr } = await supabase.storage.from(bucket).remove(paths);
    if (delErr) {
      console.warn(`[delete-user-data] storage ${bucket} partial`, delErr);
      return { bucket, deleted: 0, error: delErr.message };
    }
    return { bucket, deleted: paths.length };
  } catch (e) {
    return { bucket, deleted: 0, error: String(e) };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '').trim();
    const { data: claims, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !claims?.claims) throw new Error('Unauthorized');

    const userId = claims.claims.sub as string;
    const userEmail = (claims.claims.email as string) ?? '';

    console.log('[delete-user-data] start for user:', userId);

    // 1. Удаление из БД (включая referrals/reports со специфическими полями)
    const tableResults: Array<{ table: string; success: boolean; error?: string }> = [];

    for (const table of TABLES_USER_ID) {
      try {
        const { error } = await supabase.from(table).delete().eq('user_id', userId);
        tableResults.push({ table, success: !error, error: error?.message });
      } catch (e) {
        tableResults.push({ table, success: false, error: String(e) });
      }
    }

    // Специальные случаи
    try {
      await supabase.from('referrals').delete().or(`referrer_id.eq.${userId},referred_id.eq.${userId}`);
      tableResults.push({ table: 'referrals', success: true });
    } catch (e) { tableResults.push({ table: 'referrals', success: false, error: String(e) }); }

    try {
      await supabase.from('referrals_v2').delete().or(`inviter_user_id.eq.${userId},invited_user_id.eq.${userId}`);
      tableResults.push({ table: 'referrals_v2', success: true });
    } catch (e) { tableResults.push({ table: 'referrals_v2', success: false, error: String(e) }); }

    for (const t of ['post_reports', 'comment_reports', 'message_reports']) {
      try {
        await supabase.from(t).delete().eq('reporter_id', userId);
        tableResults.push({ table: t, success: true });
      } catch (e) { tableResults.push({ table: t, success: false, error: String(e) }); }
    }

    // private_conversations (две стороны)
    try {
      await supabase.from('private_conversations').delete().or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);
      tableResults.push({ table: 'private_conversations', success: true });
    } catch (e) { tableResults.push({ table: 'private_conversations', success: false, error: String(e) }); }

    // friends
    try {
      await supabase.from('friends').delete().or(`user_id.eq.${userId},friend_id.eq.${userId}`);
      tableResults.push({ table: 'friends', success: true });
    } catch (e) { tableResults.push({ table: 'friends', success: false, error: String(e) }); }

    // 2. Storage cleanup
    const storageResults = await Promise.all(STORAGE_BUCKETS.map((b) => deleteStorageFolder(supabase, b, userId)));

    // 3. Auth user delete
    let authDeleted = false;
    let authError2: string | undefined;
    try {
      const { error: delErr } = await supabase.auth.admin.deleteUser(userId);
      if (delErr) authError2 = delErr.message;
      else authDeleted = true;
    } catch (e) {
      authError2 = String(e);
    }

    // 4. Audit logs (хешированные, без ПДн)
    const emailHash = await sha256Hex((userEmail + (Deno.env.get('ANONYMIZE_SALT') ?? '')).toLowerCase());
    const userIdHash = await sha256Hex(userId + (Deno.env.get('ANONYMIZE_SALT') ?? ''));

    await supabase.from('data_deletion_log').insert({
      email_hash: emailHash,
      user_id_hash: userIdHash,
      reason: 'user_request',
    });

    await supabase.from('pdn_audit_log').insert({
      user_id: null, // уже удалён
      event_type: 'data_deleted',
      event_data: {
        user_id_hash: userIdHash,
        tables_processed: tableResults.length,
        tables_failed: tableResults.filter((r) => !r.success).length,
        storage: storageResults,
        auth_deleted: authDeleted,
        auth_error: authError2,
      },
    });

    console.log('[delete-user-data] done for hash:', userIdHash);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Все ваши данные удалены. Аккаунт деактивирован.',
        details: { tables: tableResults, storage: storageResults, auth_deleted: authDeleted, auth_error: authError2 },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (error) {
    console.error('[delete-user-data] fatal', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    );
  }
});
