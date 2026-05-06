import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json, requireAdmin, logAdminAction } from "../_shared/admin.ts";

type Role = 'admin' | 'moderator' | 'user';

interface CreateUserPayload {
  action: 'create_user';
  email: string;
  password: string;
  displayName?: string;
  role?: Role;
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
  displayName?: string;
}

interface AssignRolePayload {
  action: 'assign_role';
  userId: string;
  role: Role;
}

interface RevokeRolePayload {
  action: 'revoke_role';
  userId: string;
  role: Role;
}

interface LogPiiAccessPayload {
  action: 'log_pii_access';
  targetUserId: string;
  resource: 'chat_history' | 'payments' | 'export_csv' | 'database_table' | 'ai_memory';
  details?: Record<string, unknown>;
}

type Payload =
  | CreateUserPayload
  | DeleteUserPayload
  | UpdateUserPayload
  | AssignRolePayload
  | RevokeRolePayload
  | LogPiiAccessPayload;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await requireAdmin(req);
    const payload = (await req.json()) as Payload;
    console.log('[admin-users] Action:', payload.action, 'by admin:', ctx.adminId);

    switch (payload.action) {
      case 'create_user': {
        const { email, password, displayName, role } = payload;
        if (!email || !password) return json({ error: 'Email and password required' }, 400);
        if (!EMAIL_RE.test(email)) return json({ error: 'Невалидный email' }, 400);
        if (password.length < 6) return json({ error: 'Password must be at least 6 characters' }, 400);

        const { data: newUser, error: createError } = await ctx.admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
        if (createError) return json({ error: createError.message }, 400);

        const userId = newUser.user.id;

        if (displayName) {
          await ctx.admin.from('profiles').update({ display_name: displayName }).eq('user_id', userId);
        }
        if (role && role !== 'user') {
          await ctx.admin.from('user_roles').insert({ user_id: userId, role });
        }

        await logAdminAction(ctx.admin, ctx.adminId, 'create_user', 'user', userId, { email, displayName, role });
        return json({ success: true, userId, message: 'User created successfully' });
      }

      case 'delete_user': {
        const { userId, deleteAuthUser } = payload;
        if (!userId) return json({ error: 'userId required' }, 400);
        if (userId === ctx.adminId) return json({ error: 'Cannot delete yourself' }, 400);

        // Last-admin protection: cannot delete last admin
        const { data: targetRoles } = await ctx.admin
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'admin')
          .maybeSingle();
        if (targetRoles) {
          const { data: count } = await ctx.admin.rpc('count_admins');
          if ((count as number) <= 1) {
            return json({ error: 'Нельзя удалить последнего админа' }, 400);
          }
        }

        const { data: profileData } = await ctx.admin
          .from('profiles')
          .select('display_name, username')
          .eq('user_id', userId)
          .maybeSingle();

        await ctx.admin.from('user_roles').delete().eq('user_id', userId);
        await ctx.admin.from('profiles').delete().eq('user_id', userId);

        if (deleteAuthUser) {
          const { error: authDeleteError } = await ctx.admin.auth.admin.deleteUser(userId);
          if (authDeleteError) console.error('[admin-users] Auth delete error:', authDeleteError);
        }

        await logAdminAction(
          ctx.admin,
          ctx.adminId,
          deleteAuthUser ? 'delete_user_full' : 'delete_user_profile',
          'user',
          userId,
          { displayName: profileData?.display_name, username: profileData?.username, deleteAuthUser },
        );

        return json({ success: true, message: deleteAuthUser ? 'User fully deleted' : 'Profile deleted' });
      }

      case 'update_user': {
        const { userId, email, password, displayName } = payload;
        if (!userId) return json({ error: 'userId required' }, 400);

        const updates: { email?: string; password?: string } = {};
        if (email) {
          if (!EMAIL_RE.test(email)) return json({ error: 'Невалидный email' }, 400);
          updates.email = email;
        }
        if (password) {
          if (password.length < 6) return json({ error: 'Password must be at least 6 characters' }, 400);
          updates.password = password;
        }

        let trimmedDisplayName: string | undefined;
        if (typeof displayName === 'string') {
          trimmedDisplayName = displayName.trim();
          if (trimmedDisplayName.length === 0) return json({ error: 'Псевдоним не может быть пустым' }, 400);
          if (trimmedDisplayName.length > 80) return json({ error: 'Псевдоним не должен превышать 80 символов' }, 400);
        }

        if (Object.keys(updates).length === 0 && trimmedDisplayName === undefined) {
          return json({ error: 'No updates provided' }, 400);
        }

        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await ctx.admin.auth.admin.updateUserById(userId, updates);
          if (updateError) return json({ error: updateError.message }, 400);
        }

        if (trimmedDisplayName !== undefined) {
          const { error: profileError } = await ctx.admin
            .from('profiles')
            .update({ display_name: trimmedDisplayName })
            .eq('user_id', userId);
          if (profileError) return json({ error: profileError.message }, 400);
        }

        const updatedFields = [
          ...Object.keys(updates),
          ...(trimmedDisplayName !== undefined ? ['displayName'] : []),
        ];
        await logAdminAction(ctx.admin, ctx.adminId, 'update_user_auth', 'user', userId, {
          updatedFields,
        });

        return json({ success: true, message: 'User updated successfully' });
      }

      case 'assign_role': {
        const { userId, role } = payload;
        if (!userId || !role) return json({ error: 'userId and role required' }, 400);
        if (!['admin', 'moderator', 'user'].includes(role)) return json({ error: 'Invalid role' }, 400);

        if (role === 'user') {
          // assigning "user" = remove all elevated roles
          await ctx.admin.from('user_roles').delete().eq('user_id', userId);
        } else {
          // upsert: ensure role exists
          await ctx.admin.from('user_roles').upsert(
            { user_id: userId, role },
            { onConflict: 'user_id,role', ignoreDuplicates: true },
          );
        }

        await logAdminAction(ctx.admin, ctx.adminId, `assign_role_${role}`, 'user', userId, { role });
        return json({ success: true });
      }

      case 'revoke_role': {
        const { userId, role } = payload;
        if (!userId || !role) return json({ error: 'userId and role required' }, 400);

        // Last-admin protection + self-revoke for admin
        if (role === 'admin') {
          if (userId === ctx.adminId) {
            return json({ error: 'Нельзя снять роль admin с самого себя' }, 400);
          }
          const { data: count } = await ctx.admin.rpc('count_admins');
          if ((count as number) <= 1) {
            return json({ error: 'Нельзя оставить систему без админов' }, 400);
          }
        }

        const { error } = await ctx.admin
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', role);
        if (error) return json({ error: error.message }, 400);

        await logAdminAction(ctx.admin, ctx.adminId, `revoke_role_${role}`, 'user', userId, { role });
        return json({ success: true });
      }

      case 'extend_all_premium': {
        const { hours } = payload as { hours?: number };
        if (typeof hours !== 'number' || !Number.isInteger(hours) || hours < 1 || hours > 8760) {
          return json({ error: 'hours должен быть целым числом от 1 до 8760' }, 400);
        }
        const { data, error } = await ctx.admin.rpc('extend_all_premium_subscriptions', { hours_to_add: hours });
        if (error) return json({ error: error.message }, 400);
        const affected = (data as number) ?? 0;
        await logAdminAction(ctx.admin, ctx.adminId, 'extend_all_premium', 'subscriptions', null, { hours, affected });
        return json({ success: true, affected });
      }

      case 'log_pii_access': {
        // Used by frontend to record PII access (152-FZ requirement).
        const { targetUserId, resource, details } = payload;
        if (!targetUserId || !resource) return json({ error: 'targetUserId and resource required' }, 400);
        await logAdminAction(ctx.admin, ctx.adminId, `pii_access_${resource}`, 'user', targetUserId, details ?? {});
        return json({ success: true });
      }

      default:
        return json({ error: 'Unknown action' }, 400);
    }
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('[admin-users] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return json({ error: message }, 500);
  }
});
