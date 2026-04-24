import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Supabase credentials are not configured');
}

export interface AuthUser {
  id: string;
  email?: string;
  role?: string;
}

export async function getUserFromRequest(req: Request): Promise<AuthUser> {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    throw new Error('Unauthorized');
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data, error } = await supabase.auth.getClaims(token);

  if (error || !data?.claims) {
    console.error('[auth] getClaims error:', error);
    throw new Error('Unauthorized');
  }

  return {
    id: data.claims.sub as string,
    email: data.claims.email as string | undefined,
    role: data.claims.role as string | undefined,
  };
}
