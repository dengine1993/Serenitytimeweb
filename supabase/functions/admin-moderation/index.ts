// Edge function: admin-moderation
// Centralizes ALL write operations for moderation: bans, premium toggle,
// content deletion, premium grant. Frontend must call this instead of
// direct table updates (which would either fail RLS or rely on overly
// permissive policies).
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, json, requireAdmin, logAdminAction } from '../_shared/admin.ts';

type ModerationAction =
  | 'warning'
  | 'temp_ban_24h'
  | 'temp_ban_3d'
  | 'temp_ban_7d'
  | 'permanent_ban'
  | 'restriction_lifted';

interface ApplyUserActionBody {
  mode: 'apply_user_action';
  userId: string;
  action: ModerationAction;
  reason?: string;
  contentType?: 'post' | 'message' | null;
  contentId?: string | null;
  contentPreview?: string | null;
}

interface DeleteContentBody {
  mode: 'delete_content';
  contentType: 'post' | 'community_message' | 'post_comment';
  contentId: string;
}

interface TogglePremiumBody {
  mode: 'toggle_premium';
  userId: string;
  enable: boolean; // true = grant 30d, false = revoke now
}

type Body = ApplyUserActionBody | DeleteContentBody | TogglePremiumBody;

function getBanHours(action: ModerationAction): number | null {
  switch (action) {
    case 'temp_ban_24h': return 24;
    case 'temp_ban_3d': return 72;
    case 'temp_ban_7d': return 168;
    default: return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await requireAdmin(req);
    const body = (await req.json().catch(() => ({}))) as Body;

    // ---------- APPLY USER ACTION (warning / ban / lift) ----------
    if (body.mode === 'apply_user_action') {
      const { userId, action, reason, contentType, contentId, contentPreview } = body;
      if (!userId || !action) return json({ error: 'userId and action required' }, 400);

      // Self-action guard for permanent ban
      if (action === 'permanent_ban' && userId === ctx.adminId) {
        return json({ error: 'Нельзя забанить самого себя' }, 400);
      }

      // Load current profile counters
      const { data: profile } = await ctx.admin
        .from('profiles')
        .select('community_warnings_count, temp_bans_count')
        .eq('user_id', userId)
        .maybeSingle();

      const update: Record<string, unknown> = {};
      let title = '';
      let message = '';

      switch (action) {
        case 'warning':
          update.community_warnings_count = (profile?.community_warnings_count || 0) + 1;
          update.last_community_warning_at = new Date().toISOString();
          title = 'Предупреждение';
          message = `Вы получили предупреждение за нарушение правил сообщества.${reason ? ` Причина: ${reason}` : ''}`;
          break;
        case 'temp_ban_24h':
        case 'temp_ban_3d':
        case 'temp_ban_7d': {
          const hours = getBanHours(action)!;
          const restrictUntil = new Date(Date.now() + hours * 3600_000);
          update.community_restricted_until = restrictUntil.toISOString();
          update.temp_bans_count = (profile?.temp_bans_count || 0) + 1;
          const label = hours === 24 ? '24 часа' : hours === 72 ? '3 дня' : '7 дней';
          title = 'Временное ограничение';
          message = `Доступ к функциям сообщества ограничен на ${label}.${reason ? ` Причина: ${reason}` : ''}`;
          break;
        }
        case 'permanent_ban':
          update.blocked_at = new Date().toISOString();
          title = 'Аккаунт заблокирован';
          message = `Ваш аккаунт заблокирован за нарушение правил.${reason ? ` Причина: ${reason}` : ''}`;
          break;
        case 'restriction_lifted':
          update.community_restricted_until = null;
          update.blocked_at = null;
          title = 'Ограничения сняты';
          message = 'Ограничения вашего аккаунта были сняты.';
          break;
      }

      const { error: updErr } = await ctx.admin.from('profiles').update(update).eq('user_id', userId);
      if (updErr) throw updErr;

      // Notification to user
      await ctx.admin.from('notifications').insert({
        user_id: userId,
        type: 'moderation',
        title,
        message,
      });

      // Moderation history
      await ctx.admin.from('moderation_history').insert({
        user_id: userId,
        moderator_id: ctx.adminId,
        action_type: action,
        reason: reason ?? null,
        content_type: contentType ?? null,
        content_preview: contentPreview ?? null,
      });

      await logAdminAction(ctx.admin, ctx.adminId, action, 'user', userId, {
        reason: reason ?? null,
        content_type: contentType ?? null,
        content_id: contentId ?? null,
      });

      return json({ ok: true });
    }

    // ---------- DELETE CONTENT ----------
    if (body.mode === 'delete_content') {
      const { contentType, contentId } = body;
      if (!contentType || !contentId) return json({ error: 'contentType and contentId required' }, 400);

      const tableMap: Record<string, string> = {
        post: 'posts',
        community_message: 'community_messages',
        post_comment: 'post_comments',
      };
      const table = tableMap[contentType];
      if (!table) return json({ error: 'Unknown contentType' }, 400);

      const { error } = await ctx.admin.from(table).delete().eq('id', contentId);
      if (error) throw error;

      await logAdminAction(ctx.admin, ctx.adminId, `delete_${contentType}`, contentType, contentId);
      return json({ ok: true });
    }

    // ---------- TOGGLE PREMIUM ----------
    if (body.mode === 'toggle_premium') {
      const { userId, enable } = body;
      if (!userId || typeof enable !== 'boolean') return json({ error: 'userId and enable required' }, 400);

      const now = new Date();
      const periodEnd = new Date(Date.now() + 30 * 24 * 3600_000);

      const { data: existing } = await ctx.admin
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('plan', 'premium')
        .maybeSingle();

      if (enable) {
        if (existing) {
          const { error } = await ctx.admin
            .from('subscriptions')
            .update({
              status: 'active',
              current_period_start: now.toISOString(),
              current_period_end: periodEnd.toISOString(),
              updated_at: now.toISOString(),
            })
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await ctx.admin.from('subscriptions').insert({
            user_id: userId,
            plan: 'premium',
            status: 'active',
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            payment_provider: 'admin_manual',
            auto_renew: false,
          });
          if (error) throw error;
        }
        await ctx.admin
          .from('profiles')
          .update({ premium_until: periodEnd.toISOString(), plan: 'premium', updated_at: now.toISOString() })
          .eq('user_id', userId);
      } else {
        if (existing) {
          const { error } = await ctx.admin
            .from('subscriptions')
            .update({ status: 'canceled', current_period_end: now.toISOString(), updated_at: now.toISOString() })
            .eq('id', existing.id);
          if (error) throw error;
        }
        await ctx.admin
          .from('profiles')
          .update({ premium_until: null, plan: 'free', updated_at: now.toISOString() })
          .eq('user_id', userId);
      }

      await logAdminAction(
        ctx.admin,
        ctx.adminId,
        enable ? 'add_premium' : 'remove_premium',
        'user',
        userId,
        { premium_until: enable ? periodEnd.toISOString() : null },
      );

      return json({ ok: true });
    }

    return json({ error: 'Unknown mode' }, 400);
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[admin-moderation] error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return json({ error: message }, 500);
  }
});
