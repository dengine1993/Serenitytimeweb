import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Search, Ban, CheckCircle, Shield, Eye, Trash2, RefreshCw, Crown, ShieldOff, UserPlus, Plus, Copy, MessageSquareOff } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ModerationHistoryPanel } from "@/components/admin/ModerationHistoryPanel";
import { ModerationActionSelect, getBanDuration, type ModerationActionType } from "@/components/admin/ModerationActionSelect";
import { useIsAdmin } from "@/hooks/useIsAdmin";

interface User {
  id: string;
  user_id: string;
  display_name: string | null;
  username: string | null;
  created_at: string;
  blocked_at: string | null;
  posts_count: number;
  ai_messages_count: number;
  subscription_status: string | null;
  subscription_end: string | null;
  premium_until: string | null;
  is_premium_flag: boolean;
  community_warnings_count: number;
  community_restricted_until: string | null;
  temp_bans_count: number;
  // Role from user_roles
  role: 'admin' | 'moderator' | 'user';
}

interface ChatMessage {
  id: string;
  content: string;
  role: string;
  created_at: string;
}

export default function AdminUsers() {
  const { isAdmin } = useIsAdmin();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "blocked" | "restricted">("all");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "moderator" | "user">("all");
  
  // Chat history modal
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);

  // Moderation modal
  const [moderationUser, setModerationUser] = useState<User | null>(null);
  const [selectedAction, setSelectedAction] = useState<ModerationActionType>('warning');
  const [moderationReason, setModerationReason] = useState('');
  const [isApplyingAction, setIsApplyingAction] = useState(false);

  // Create user modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserDisplayName, setNewUserDisplayName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'user' | 'moderator' | 'admin'>('user');

  // Delete user modal
  const [deleteUserTarget, setDeleteUserTarget] = useState<User | null>(null);
  const [deleteAuthUser, setDeleteAuthUser] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, searchQuery, statusFilter, roleFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Load profiles with moderation fields + premium_until
      const { data: profilesData, error } = await supabase
        .from("profiles")
        .select("id, user_id, display_name, username, created_at, blocked_at, community_warnings_count, community_restricted_until, temp_bans_count, premium_until")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      // Load user roles
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id, role");

      const rolesMap: Record<string, string> = {};
      rolesData?.forEach(r => {
        // Priority: admin > moderator > user
        if (r.role === 'admin' || (rolesMap[r.user_id] !== 'admin' && r.role === 'moderator')) {
          rolesMap[r.user_id] = r.role;
        }
      });

      // Load subscriptions
      const { data: subscriptionsData } = await supabase
        .from("subscriptions")
        .select("user_id, status, current_period_end, plan")
        .eq("plan", "premium");
      
      const subscriptionsMap: Record<string, { status: string | null; end: string | null }> = {};
      subscriptionsData?.forEach(s => {
        subscriptionsMap[s.user_id] = { status: s.status, end: s.current_period_end };
      });

      // Load posts counts
      const { data: postsData } = await supabase
        .from("posts")
        .select("user_id");
      
      const postsCounts: Record<string, number> = {};
      postsData?.forEach(p => {
        postsCounts[p.user_id] = (postsCounts[p.user_id] || 0) + 1;
      });

      // Load AI messages counts
      const { data: aiData } = await supabase.from("ai_messages").select("user_id");

      const aiCounts: Record<string, number> = {};
      aiData?.forEach(m => {
        aiCounts[m.user_id] = (aiCounts[m.user_id] || 0) + 1;
      });

      // Source of truth for premium: RPC that checks both subscriptions and profiles.premium_until
      const allUserIds = (profilesData || []).map(p => p.user_id);
      let premiumSet = new Set<string>();
      if (allUserIds.length > 0) {
        const { data: premiumIds } = await supabase.rpc('get_premium_user_ids', { user_ids: allUserIds });
        premiumSet = new Set((premiumIds as string[] | null) || []);
      }

      // Combine data
      const usersWithStats = (profilesData || []).map(profile => ({
        ...profile,
        posts_count: postsCounts[profile.user_id] || 0,
        ai_messages_count: aiCounts[profile.user_id] || 0,
        subscription_status: subscriptionsMap[profile.user_id]?.status || null,
        subscription_end: subscriptionsMap[profile.user_id]?.end || null,
        premium_until: profile.premium_until || null,
        is_premium_flag: premiumSet.has(profile.user_id),
        community_warnings_count: profile.community_warnings_count || 0,
        community_restricted_until: profile.community_restricted_until || null,
        temp_bans_count: profile.temp_bans_count || 0,
        role: (rolesMap[profile.user_id] as 'admin' | 'moderator' | 'user') || 'user',
      }));

      setUsers(usersWithStats);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Ошибка загрузки пользователей");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...users];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u => 
        (u.display_name || "").toLowerCase().includes(query) ||
        (u.username || "").toLowerCase().includes(query) ||
        u.user_id.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter === "active") {
      filtered = filtered.filter(u => !u.blocked_at && !isRestricted(u));
    } else if (statusFilter === "blocked") {
      filtered = filtered.filter(u => u.blocked_at);
    } else if (statusFilter === "restricted") {
      filtered = filtered.filter(u => isRestricted(u));
    }

    // Role filter
    if (roleFilter === "admin") {
      filtered = filtered.filter(u => u.role === 'admin');
    } else if (roleFilter === "moderator") {
      filtered = filtered.filter(u => u.role === 'moderator');
    } else if (roleFilter === "user") {
      filtered = filtered.filter(u => u.role === 'user');
    }

    setFilteredUsers(filtered);
  };

  const viewChatHistory = async (user: User) => {
    setSelectedUser(user);
    setLoadingChat(true);
    setChatHistory([]);

    try {
      // Use edge function to read AI chat history (ai_messages)
      const { data, error } = await supabase.functions.invoke("admin-ai-usage", {
        body: { mode: "chat", userId: user.user_id },
      });

      if (error) throw error;
      setChatHistory(data?.chatHistory || []);
    } catch (error) {
      console.error("Error loading chat:", error);
      toast.error("Ошибка загрузки чата");
    } finally {
      setLoadingChat(false);
    }
  };

  const openDeleteModal = (user: User) => {
    setDeleteUserTarget(user);
    setDeleteAuthUser(false);
  };

  const closeDeleteModal = () => {
    setDeleteUserTarget(null);
    setDeleteAuthUser(false);
    setDeleteLoading(false);
  };

  const confirmDeleteUser = async () => {
    if (!deleteUserTarget) return;

    setDeleteLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: {
          action: 'delete_user',
          userId: deleteUserTarget.user_id,
          deleteAuthUser,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Unknown error');

      toast.success(deleteAuthUser ? 'Пользователь полностью удалён' : 'Профиль удалён');
      closeDeleteModal();
      loadUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(error.message || "Ошибка удаления");
    } finally {
      setDeleteLoading(false);
    }
  };

  const createUser = async () => {
    if (!newUserEmail || !newUserPassword) {
      toast.error('Email и пароль обязательны');
      return;
    }

    if (newUserPassword.length < 6) {
      toast.error('Пароль должен быть минимум 6 символов');
      return;
    }

    setCreateLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: {
          action: 'create_user',
          email: newUserEmail,
          password: newUserPassword,
          displayName: newUserDisplayName || undefined,
          role: newUserRole,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Unknown error');

      toast.success('Пользователь создан');
      setShowCreateModal(false);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserDisplayName('');
      setNewUserRole('user');
      loadUsers();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(error.message || "Ошибка создания пользователя");
    } finally {
      setCreateLoading(false);
    }
  };

  const isPremium = (user: User) => user.is_premium_flag;

  const isRestricted = (user: User) => {
    if (!user.community_restricted_until) return false;
    return new Date(user.community_restricted_until) > new Date();
  };

  const openModerationModal = (user: User) => {
    setModerationUser(user);
    setSelectedAction('warning');
    setModerationReason('');
  };

  const closeModerationModal = () => {
    setModerationUser(null);
    setSelectedAction('warning');
    setModerationReason('');
  };

  const applyModerationAction = async () => {
    if (!moderationUser) return;
    
    setIsApplyingAction(true);
    
    try {
      const { data: { user: moderator } } = await supabase.auth.getUser();
      const targetUserId = moderationUser.user_id;
      
      let updateData: Record<string, unknown> = {};
      let actionType = selectedAction;
      let notificationTitle = '';
      let notificationMessage = '';
      
      switch (selectedAction) {
        case 'warning':
          updateData = {
            community_warnings_count: (moderationUser.community_warnings_count || 0) + 1,
            last_community_warning_at: new Date().toISOString()
          };
          notificationTitle = 'Предупреждение';
          notificationMessage = `Вы получили предупреждение за нарушение правил сообщества. ${moderationReason ? `Причина: ${moderationReason}` : 'При повторных нарушениях доступ к сообществу будет ограничен.'}`;
          break;
          
        case 'temp_ban_24h':
        case 'temp_ban_3d':
        case 'temp_ban_7d': {
          const hours = getBanDuration(selectedAction);
          if (!hours) break;
          
          const restrictUntil = new Date();
          restrictUntil.setHours(restrictUntil.getHours() + hours);
          
          updateData = {
            community_restricted_until: restrictUntil.toISOString(),
            temp_bans_count: (moderationUser.temp_bans_count || 0) + 1
          };
          
          const durationLabel = hours === 24 ? '24 часа' : hours === 72 ? '3 дня' : '7 дней';
          notificationTitle = 'Временное ограничение';
          notificationMessage = `Доступ к функциям сообщества ограничен на ${durationLabel}. ${moderationReason ? `Причина: ${moderationReason}` : 'При повторных нарушениях аккаунт будет заблокирован.'}`;
          break;
        }
          
        case 'permanent_ban':
          updateData = {
            blocked_at: new Date().toISOString()
          };
          notificationTitle = 'Аккаунт заблокирован';
          notificationMessage = `Ваш аккаунт заблокирован за грубое нарушение правил сообщества. ${moderationReason ? `Причина: ${moderationReason}` : ''}`;
          break;

        case 'restriction_lifted':
          updateData = {
            community_restricted_until: null,
            blocked_at: null
          };
          notificationTitle = 'Ограничения сняты';
          notificationMessage = 'Ограничения вашего аккаунта были сняты.';
          break;
      }
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', targetUserId);
      
      if (updateError) throw updateError;
      
      // Create notification for user
      await supabase.from('notifications').insert({
        user_id: targetUserId,
        type: 'moderation',
        title: notificationTitle,
        message: notificationMessage
      });
      
      // Log in moderation_history
      await supabase.from('moderation_history').insert({
        user_id: targetUserId,
        moderator_id: moderator?.id,
        action_type: actionType,
        reason: moderationReason || null,
        content_type: null,
        content_preview: null
      });
      
      // Log admin action
      await supabase.from('admin_logs').insert({
        admin_id: moderator?.id,
        action: actionType,
        target_type: 'user',
        target_id: targetUserId,
        details: { reason: moderationReason }
      });
      
      const actionLabels: Record<ModerationActionType, string> = {
        warning: 'Предупреждение выдано',
        temp_ban_24h: 'Бан на 24 часа применён',
        temp_ban_3d: 'Бан на 3 дня применён',
        temp_ban_7d: 'Бан на 7 дней применён',
        permanent_ban: 'Вечный бан применён',
        restriction_lifted: 'Ограничения сняты'
      };
      
      toast.success(actionLabels[selectedAction]);
      closeModerationModal();
      loadUsers();
      
    } catch (error) {
      console.error("Error applying moderation action:", error);
      toast.error("Ошибка применения действия");
    } finally {
      setIsApplyingAction(false);
    }
  };

  const togglePremium = async (user: User) => {
    try {
      const { data: { user: admin } } = await supabase.auth.getUser();
      
      const isPremiumNow = isPremium(user);
      const now = new Date();
      const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.user_id)
        .eq('plan', 'premium')
        .maybeSingle();

      if (isPremiumNow) {
        if (existingSub) {
          const { error } = await supabase
            .from('subscriptions')
            .update({ 
              status: 'canceled',
              current_period_end: now.toISOString()
            })
            .eq('id', existingSub.id);
          if (error) throw error;
        }
      } else {
        if (existingSub) {
          const { error } = await supabase
            .from('subscriptions')
            .update({ 
              status: 'active',
              current_period_start: now.toISOString(),
              current_period_end: thirtyDaysLater.toISOString()
            })
            .eq('id', existingSub.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('subscriptions')
            .insert({ 
              user_id: user.user_id,
              plan: 'premium',
              status: 'active',
              current_period_start: now.toISOString(),
              current_period_end: thirtyDaysLater.toISOString(),
              payment_provider: 'admin_manual'
            });
          if (error) throw error;
        }
      }

      await supabase.from("admin_logs").insert({
        admin_id: admin?.id,
        action: isPremiumNow ? "remove_premium" : "add_premium",
        target_type: "user",
        target_id: user.user_id,
        details: { premium_until: isPremiumNow ? null : thirtyDaysLater.toISOString() }
      });

      toast.success(isPremiumNow ? "Premium отключён" : "Premium включён на 30 дней");
      loadUsers();
    } catch (error) {
      console.error("Error toggling premium:", error);
      toast.error("Ошибка изменения Premium");
    }
  };

  const toggleAdmin = async (user: User) => {
    if (!isAdmin) {
      toast.error("Только админы могут управлять ролями");
      return;
    }

    try {
      const { data: { user: admin } } = await supabase.auth.getUser();

      if (user.role === 'admin') {
        await supabase.from("user_roles").delete().eq("user_id", user.user_id).eq("role", "admin");
      } else {
        await supabase.from("user_roles").upsert({ user_id: user.user_id, role: "admin" });
      }

      await supabase.from("admin_logs").insert({
        admin_id: admin?.id,
        action: user.role === 'admin' ? "remove_admin" : "add_admin",
        target_type: "user",
        target_id: user.user_id,
      });

      toast.success(user.role === 'admin' ? "Роль админа снята" : "Роль админа назначена");
      loadUsers();
    } catch (error) {
      console.error("Error toggling admin:", error);
      toast.error("Ошибка изменения роли");
    }
  };

  const toggleModerator = async (user: User) => {
    if (!isAdmin) {
      toast.error("Только админы могут назначать модераторов");
      return;
    }

    try {
      const { data: { user: admin } } = await supabase.auth.getUser();

      if (user.role === 'moderator') {
        await supabase.from("user_roles").delete().eq("user_id", user.user_id).eq("role", "moderator");
      } else {
        await supabase.from("user_roles").upsert({ user_id: user.user_id, role: "moderator" });
      }

      await supabase.from("admin_logs").insert({
        admin_id: admin?.id,
        action: user.role === 'moderator' ? "remove_moderator" : "add_moderator",
        target_type: "user",
        target_id: user.user_id,
      });

      toast.success(user.role === 'moderator' ? "Роль модератора снята" : "Модератор назначен");
      loadUsers();
    } catch (error) {
      console.error("Error toggling moderator:", error);
      toast.error("Ошибка изменения роли");
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-purple-500/20 text-purple-400">Admin</Badge>;
      case 'moderator':
        return <Badge className="bg-blue-500/20 text-blue-400">Mod</Badge>;
      default:
        return <Badge variant="secondary">User</Badge>;
    }
  };

  const getStatusBadge = (user: User) => {
    if (user.blocked_at) {
      return <Badge variant="destructive">Заблокирован</Badge>;
    }
    if (isRestricted(user)) {
      return (
        <Badge className="bg-orange-500/20 text-orange-400">
          Бан ({user.temp_bans_count}/3)
        </Badge>
      );
    }
    if (user.community_warnings_count > 0) {
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400">
          ⚠️ {user.community_warnings_count}
        </Badge>
      );
    }
    return <Badge className="bg-green-500/20 text-green-400">Активен</Badge>;
  };

  return (
    <AdminLayout title="Пользователи" description="Управление пользователями платформы">
      {/* Filters */}
      <Card className="bg-card/50 backdrop-blur border-border/50 mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по имени, username или ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={(v: "all" | "active" | "blocked" | "restricted") => setStatusFilter(v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="active">Активные</SelectItem>
                <SelectItem value="restricted">Ограничены</SelectItem>
                <SelectItem value="blocked">Заблокированы</SelectItem>
              </SelectContent>
            </Select>

            <Select value={roleFilter} onValueChange={(v: "all" | "admin" | "moderator" | "user") => setRoleFilter(v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Роль" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="admin">Админы</SelectItem>
                <SelectItem value="moderator">Модераторы</SelectItem>
                <SelectItem value="user">Пользователи</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={loadUsers} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>

            {isAdmin && (
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Создать
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Users table */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead>Пользователь</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead>Посты</TableHead>
                <TableHead>AI</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} className="border-border/50">
                  <TableCell>
                    <div>
                      <p className="font-medium">{user.display_name || user.username || "Без имени"}</p>
                      <div className="flex items-center gap-1">
                        <p className="text-xs text-muted-foreground truncate max-w-[180px]" title={user.user_id}>{user.user_id}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(user.user_id);
                            toast.success("ID скопирован");
                          }}
                          title="Скопировать User ID"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString('ru-RU')}
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">{user.posts_count}</span>
                  </TableCell>
                  <TableCell>
                    <span className={user.ai_messages_count > 100 ? 'text-yellow-400 font-medium' : 'text-muted-foreground'}>
                      {user.ai_messages_count}
                    </span>
                  </TableCell>
                  <TableCell>{getStatusBadge(user)}</TableCell>
                  <TableCell>
                    {isPremium(user) ? (
                      <Badge className="bg-yellow-500/20 text-yellow-400">Premium</Badge>
                    ) : (
                      <Badge variant="secondary">Free</Badge>
                    )}
                  </TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => viewChatHistory(user)}
                        title="Просмотр AI-чата"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openModerationModal(user)}
                        title="Модерация"
                      >
                        <ShieldOff className="h-4 w-4 text-amber-400" />
                      </Button>
                      {isAdmin && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => togglePremium(user)}
                            title={isPremium(user) ? "Отключить Premium" : "Включить Premium"}
                          >
                            <Crown className={`h-4 w-4 ${isPremium(user) ? 'text-yellow-400' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleModerator(user)}
                            title={user.role === 'moderator' ? "Снять модератора" : "Назначить модератором"}
                          >
                            <UserPlus className={`h-4 w-4 ${user.role === 'moderator' ? 'text-blue-400' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleAdmin(user)}
                            title={user.role === 'admin' ? "Снять админа" : "Назначить админом"}
                          >
                            <Shield className={`h-4 w-4 ${user.role === 'admin' ? 'text-purple-400' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteModal(user)}
                            title="Удалить пользователя"
                          >
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredUsers.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              {loading ? "Загрузка..." : "Пользователи не найдены"}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground mt-4">
        Показано {filteredUsers.length} из {users.length} пользователей
      </p>

      {/* Chat history modal */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              История AI-чата: {selectedUser?.display_name || selectedUser?.username || "Пользователь"}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="h-[500px] pr-4">
            {loadingChat ? (
              <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
            ) : chatHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquareOff className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">Нет истории диалога с ИИ</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Этот пользователь ещё не отправлял сообщений Jiva, либо его история была очищена.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {chatHistory.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg ${
                      msg.role === 'user' 
                        ? 'bg-primary/10 ml-8' 
                        : 'bg-muted/50 mr-8'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium">
                        {msg.role === 'user' ? 'Пользователь' : 'AI'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(msg.created_at).toLocaleString('ru-RU')}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Moderation modal with history and progressive actions */}
      <Dialog open={!!moderationUser} onOpenChange={closeModerationModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldOff className="h-5 w-5 text-amber-400" />
              Модерация пользователя
            </DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">
                {moderationUser?.display_name || moderationUser?.username || 'Пользователь'}
              </span>
              <span className="ml-2 text-muted-foreground">
                • Предупреждений: {moderationUser?.community_warnings_count || 0}
                • Временных банов: {moderationUser?.temp_bans_count || 0}/3
              </span>
            </DialogDescription>
          </DialogHeader>
          
          {moderationUser && (
            <div className="space-y-4 py-2">
              {/* History panel */}
              <div>
                <h4 className="text-sm font-medium mb-2">📋 История модерации</h4>
                <ModerationHistoryPanel userId={moderationUser.user_id} />
              </div>

              <Separator />

              {/* Action selection */}
              <div>
                <h4 className="text-sm font-medium mb-3">Выберите действие</h4>
                <ModerationActionSelect
                  value={selectedAction}
                  onChange={setSelectedAction}
                  warningsCount={moderationUser.community_warnings_count || 0}
                  tempBansCount={moderationUser.temp_bans_count || 0}
                  isAdmin={isAdmin}
                  isBlocked={!!moderationUser.blocked_at}
                  isRestricted={isRestricted(moderationUser)}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Причина (опционально)</label>
                <Textarea 
                  placeholder="Укажите причину для пользователя..."
                  value={moderationReason}
                  onChange={(e) => setModerationReason(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={closeModerationModal}>
              Отмена
            </Button>
            <Button 
              onClick={applyModerationAction}
              disabled={isApplyingAction}
              variant={selectedAction === 'permanent_ban' ? 'destructive' : 'default'}
            >
              {isApplyingAction ? 'Применяется...' : 'Применить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create user modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Создать пользователя
            </DialogTitle>
            <DialogDescription>
              Создайте нового пользователя с указанными данными
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Пароль *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Минимум 6 символов"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Имя</Label>
              <Input
                id="displayName"
                placeholder="Имя пользователя"
                value={newUserDisplayName}
                onChange={(e) => setNewUserDisplayName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Роль</Label>
              <Select value={newUserRole} onValueChange={(v: 'user' | 'moderator' | 'admin') => setNewUserRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Пользователь</SelectItem>
                  <SelectItem value="moderator">Модератор</SelectItem>
                  <SelectItem value="admin">Администратор</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Отмена
            </Button>
            <Button onClick={createUser} disabled={createLoading}>
              {createLoading ? 'Создание...' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete user modal */}
      <Dialog open={!!deleteUserTarget} onOpenChange={closeDeleteModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Удалить пользователя
            </DialogTitle>
            <DialogDescription>
              Удаление пользователя{' '}
              <span className="font-medium text-foreground">
                {deleteUserTarget?.display_name || deleteUserTarget?.username || deleteUserTarget?.user_id}
              </span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="flex items-start space-x-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <Checkbox
                id="deleteAuth"
                checked={deleteAuthUser}
                onCheckedChange={(checked) => setDeleteAuthUser(checked === true)}
              />
              <div>
                <Label htmlFor="deleteAuth" className="font-medium cursor-pointer">
                  Полное удаление из auth.users
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Пользователь не сможет войти даже с теми же учётными данными. 
                  Без этой опции удаляется только профиль.
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Это действие необратимо. Все данные пользователя будут удалены.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDeleteModal}>
              Отмена
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteUser}
              disabled={deleteLoading}
            >
              {deleteLoading ? 'Удаление...' : 'Удалить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
