// Shared helpers for admin-* edge functions: auth, role check, search sanitization.
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export interface AdminContext {
  adminId: string;
  email?: string;
  admin: SupabaseClient;
}

/**
 * Verify caller is an admin. Returns context or throws Response (401/403).
 */
export async function requireAdmin(req: Request): Promise<AdminContext> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw json({ error: 'Unauthorized' }, 401);
  }
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) throw json({ error: 'Unauthorized' }, 401);

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data, error } = await userClient.auth.getClaims(token);
  if (error || !data?.claims) throw json({ error: 'Unauthorized' }, 401);

  const adminId = data.claims.sub as string;
  const email = data.claims.email as string | undefined;

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: roleRow } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', adminId)
    .eq('role', 'admin')
    .maybeSingle();

  if (!roleRow) throw json({ error: 'Forbidden: admin role required' }, 403);

  return { adminId, email, admin };
}

/**
 * Sanitize free-text search input for use in PostgREST `.or()` ilike filters.
 * Strips characters that can break the filter syntax or cause injection.
 * Allowed: letters, digits, dash, underscore, dot, space, @, basic cyrillic.
 */
export function sanitizeSearch(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  // Limit length to prevent abuse
  const trimmed = raw.trim().slice(0, 100);
  // Strip PostgREST special chars (, ( ) %  *) and quotes
  return trimmed.replace(/[(),%*"'\\]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Write an entry to admin_logs. Best-effort, never throws.
 */
export async function logAdminAction(
  admin: SupabaseClient,
  adminId: string,
  action: string,
  targetType: string | null,
  targetId: string | null,
  details: Record<string, unknown> = {},
): Promise<void> {
  try {
    await admin.from('admin_logs').insert({
      admin_id: adminId,
      action,
      target_type: targetType,
      target_id: targetId,
      details,
    });
  } catch (e) {
    console.error('[admin-log] insert failed:', e);
  }
}
