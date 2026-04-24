import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserPayload {
  action: 'create_user';
  email: string;
  password: string;
  displayName?: string;
  role?: 'admin' | 'moderator' | 'user';
}

interface DeleteUserPayload {
  action: 'delete_user';
  userId: string;
  deleteAuthUser: boolean;
}

interface UpdateUserPayload {
  action: 'update_user';
  userId: string;
  email?: string;
  password?: string;
}

type AdminPayload = CreateUserPayload | DeleteUserPayload | UpdateUserPayload;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Create regular client to verify caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const { data: { user: caller }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if caller is admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload: AdminPayload = await req.json();
    console.log('[admin-users] Action:', payload.action, 'by admin:', caller.id);

    switch (payload.action) {
      case 'create_user': {
        const { email, password, displayName, role } = payload;

        if (!email || !password) {
          return new Response(JSON.stringify({ error: 'Email and password required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (password.length < 6) {
          return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Create user in auth.users
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true, // Auto-confirm email
        });

        if (createError) {
          console.error('[admin-users] Create user error:', createError);
          return new Response(JSON.stringify({ error: createError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const userId = newUser.user.id;

        // Profile is created automatically by trigger, but update display_name if provided
        if (displayName) {
          await supabaseAdmin
            .from('profiles')
            .update({ display_name: displayName })
            .eq('user_id', userId);
        }

        // Assign role if not default user
        if (role && role !== 'user') {
          await supabaseAdmin
            .from('user_roles')
            .insert({ user_id: userId, role });

        }

        // Log admin action
        await supabaseAdmin.from('admin_logs').insert({
          admin_id: caller.id,
          action: 'create_user',
          target_type: 'user',
          target_id: userId,
          details: { email, displayName, role },
        });

        console.log('[admin-users] User created:', userId);

        return new Response(JSON.stringify({ 
          success: true, 
          userId,
          message: 'User created successfully' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'delete_user': {
        const { userId, deleteAuthUser } = payload;

        if (!userId) {
          return new Response(JSON.stringify({ error: 'userId required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Prevent self-deletion
        if (userId === caller.id) {
          return new Response(JSON.stringify({ error: 'Cannot delete yourself' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get user info before deletion for logging
        const { data: profileData } = await supabaseAdmin
          .from('profiles')
          .select('display_name, username')
          .eq('user_id', userId)
          .maybeSingle();

        // Delete from user_roles
        await supabaseAdmin
          .from('user_roles')
          .delete()
          .eq('user_id', userId);

        // Delete profile
        await supabaseAdmin
          .from('profiles')
          .delete()
          .eq('user_id', userId);

        // Delete from auth.users if requested
        if (deleteAuthUser) {
          const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
          if (authDeleteError) {
            console.error('[admin-users] Auth delete error:', authDeleteError);
            // Continue even if auth delete fails - profile is already deleted
          }
        }

        // Log admin action
        await supabaseAdmin.from('admin_logs').insert({
          admin_id: caller.id,
          action: deleteAuthUser ? 'delete_user_full' : 'delete_user_profile',
          target_type: 'user',
          target_id: userId,
          details: { 
            displayName: profileData?.display_name,
            username: profileData?.username,
            deleteAuthUser 
          },
        });

        console.log('[admin-users] User deleted:', userId, 'full:', deleteAuthUser);

        return new Response(JSON.stringify({ 
          success: true,
          message: deleteAuthUser ? 'User fully deleted' : 'Profile deleted'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'update_user': {
        const { userId, email, password } = payload;

        if (!userId) {
          return new Response(JSON.stringify({ error: 'userId required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const updates: { email?: string; password?: string } = {};
        if (email) updates.email = email;
        if (password) {
          if (password.length < 6) {
            return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          updates.password = password;
        }

        if (Object.keys(updates).length === 0) {
          return new Response(JSON.stringify({ error: 'No updates provided' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, updates);

        if (updateError) {
          console.error('[admin-users] Update error:', updateError);
          return new Response(JSON.stringify({ error: updateError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Log admin action
        await supabaseAdmin.from('admin_logs').insert({
          admin_id: caller.id,
          action: 'update_user_auth',
          target_type: 'user',
          target_id: userId,
          details: { updatedFields: Object.keys(updates) },
        });

        console.log('[admin-users] User updated:', userId);

        return new Response(JSON.stringify({ 
          success: true,
          message: 'User updated successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error: unknown) {
    console.error('[admin-users] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
