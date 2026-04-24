import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getUserFromRequest } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function unauthorizedResponse(message = 'Unauthorized') {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
}

function forbiddenResponse(message = 'Forbidden') {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
}

function getSupabaseAdminClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !key) {
    throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured');
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return unauthorizedResponse();
  }

  let requestingUser;
  try {
    requestingUser = await getUserFromRequest(req);
  } catch (error) {
    console.error('Failed auth in create-first-admin:', error);
    return unauthorizedResponse();
  }

  const bootstrapSecret = Deno.env.get('ADMIN_BOOTSTRAP_SECRET');
  if (bootstrapSecret) {
    const headerSecret = req.headers.get('x-admin-bootstrap-secret');
    if (!headerSecret || headerSecret !== bootstrapSecret) {
      return forbiddenResponse('Invalid admin bootstrap secret');
    }
  }

  try {
    const supabaseAdmin = getSupabaseAdminClient();

    // Ensure requester is already an admin
    const { data: requesterRole, error: roleCheckError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleCheckError) {
      console.error('Error checking requester role:', roleCheckError);
      throw roleCheckError;
    }

    if (!requesterRole) {
      return forbiddenResponse('Only existing admins can create new admins');
    }

    const { email, password, username } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log('Creating admin user:', email);

    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username: username || 'admin',
        display_name: username || 'Administrator',
      },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      throw createError;
    }

    console.log('User created:', userData.user.id);

    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userData.user.id,
        role: 'admin',
      });

    if (roleError) {
      console.error('Error adding admin role:', roleError);
      throw roleError;
    }

    console.log('Admin role added successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Admin user created successfully',
        user_id: userData.user.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error in create-first-admin:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
}

serve(handler);

