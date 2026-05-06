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
import { Search, Ban, CheckCircle, Shield, Eye, Trash2, RefreshCw, Crown, ShieldOff, UserPlus, Plus, Copy, MessageSquareOff, Download, Pencil } from "lucide-react";
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

  // Bulk extend premium modal
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendHours, setExtendHours] = useState<number>(24);
  const [extendConfirmed, setExtendConfirmed] = useState(false);
  const [extendLoading, setExtendLoading] = useState(false);

  // Edit user modal
  const [editUserTarget, setEditUserTarget] = useState<User | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

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

      // Server-side aggregation of activity counts (no 1000-row client limit).
      const allUserIds = (profilesData || []).map(p => p.user_id);
      const postsCounts: Record<string, number> = {};
      const aiCounts: Record<string, number> = {};
      if (allUserIds.length > 0) {
        const { data: counts } = await supabase.rpc('get_user_activity_counts', { p_user_ids: allUserIds });
        (counts as Array<{ user_id: string; posts_count: number; ai_messages_count: number }> | null)?.forEach((c) => {
          postsCounts[c.user_id] = Number(c.posts_count) || 0;
          aiCounts[c.user_id] = Number(c.ai_messages_count) || 0;
        });
      }

      // Source of truth for premium: RPC that checks both subscriptions and profiles.premium_until
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
      // 152-FZ: log PII access (read of user's AI chat). Best-effort, non-blocking.
      supabase.functions.invoke('admin-users', {
        body: { action: 'log_pii_access', targetUserId: user.user_id, resource: 'chat_history' },
      }).catch((e) => console.warn('[pii-log] failed:', e));

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

  const openEditModal = (user: User) => {
    setEditUserTarget(user);
    setEditDisplayName(user.display_name || '');
    setEditEmail('');
    setEditPassword('');
    setShowEditPassword(false);
  };

  const closeEditModal = () => {
    if (editLoading) return;
    setEditUserTarget(null);
    setEditDisplayName('');
    setEditEmail('');
    setEditPassword('');
    setShowEditPassword(false);
  };

  const saveEditUser = async () => {
    if (!editUserTarget) return;

    const body: Record<string, unknown> = {
      action: 'update_user',
      userId: editUserTarget.user_id,
    };

    const trimmedName = editDisplayName.trim();
    if (trimmedName !== (editUserTarget.display_name || '')) {
      if (trimmedName.length === 0) {
        toast.error('Псевдоним не может быть пустым');
        return;
      }
      if (trimmedName.length > 80) {
        toast.error('Псевдоним не должен превышать 80 символов');
        return;
      }
      body.displayName = trimmedName;
    }

    const trimmedEmail = editEmail.trim();
    if (trimmedEmail) {
      body.email = trimmedEmail;
    }

    if (editPassword) {
      if (editPassword.length < 6) {
        toast.error('Пароль должен быть минимум 6 символов');
        return;
      }
      body.password = editPassword;
    }

    if (!('displayName' in body) && !('email' in body) && !('password' in body)) {
      toast.error('Нет изменений для сохранения');
      return;
    }

    setEditLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', { body });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Unknown error');

      toast.success('Пользователь обновлён');
      setEditUserTarget(null);
      setEditDisplayName('');
      setEditEmail('');
      setEditPassword('');
      setShowEditPassword(false);
      loadUsers();
    } catch (err: any) {
      console.error('Error updating user:', err);
      toast.error(err?.message || 'Ошибка обновления');
    } finally {
      setEditLoading(false);
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
      const { data, error } = await supabase.functions.invoke('admin-moderation', {
        body: {
          mode: 'apply_user_action',
          userId: moderationUser.user_id,
          action: selectedAction,
          reason: moderationReason || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const actionLabels: Record<ModerationActionType, string> = {
        warning: 'Предупреждение выдано',
        temp_ban_24h: 'Бан на 24 часа применён',
        temp_ban_3d: 'Бан на 3 дня применён',
        temp_ban_7d: 'Бан на 7 дней применён',
        permanent_ban: 'Вечный бан применён',
        restriction_lifted: 'Ограничения сняты',
      };
      toast.success(actionLabels[selectedAction]);
      closeModerationModal();
      loadUsers();
    } catch (error: any) {
      console.error("Error applying moderation action:", error);
      toast.error(error?.message || "Ошибка применения действия");
    } finally {
      setIsApplyingAction(false);
    }
  };

  const togglePremium = async (user: User) => {
    try {
      const enable = !isPremium(user);
      const { data, error } = await supabase.functions.invoke('admin-moderation', {
        body: { mode: 'toggle_premium', userId: user.user_id, enable },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(enable ? "Premium включён на 30 дней" : "Premium отключён");
      loadUsers();
    } catch (error: any) {
      console.error("Error toggling premium:", error);
      toast.error(error?.message || "Ошибка изменения Premium");
    }
  };

  const toggleAdmin = async (user: User) => {
    if (!isAdmin) {
      toast.error("Только админы могут управлять ролями");
      return;
    }
    try {
      const isCurrent = user.role === 'admin';
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: {
          action: isCurrent ? 'revoke_role' : 'assign_role',
          userId: user.user_id,
          role: 'admin',
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(isCurrent ? "Роль админа снята" : "Роль админа назначена");
      loadUsers();
    } catch (error: any) {
      console.error("Error toggling admin:", error);
      toast.error(error?.message || "Ошибка изменения роли");
    }
  };

  const toggleModerator = async (user: User) => {
    if (!isAdmin) {
      toast.error("Только админы могут назначать модераторов");
      return;
    }
    try {
      const isCurrent = user.role === 'moderator';
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: {
          action: isCurrent ? 'revoke_role' : 'assign_role',
          userId: user.user_id,
          role: 'moderator',
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(isCurrent ? "Роль модератора снята" : "Модератор назначен");
      loadUsers();
    } catch (error: any) {
      console.error("Error toggling moderator:", error);
      toast.error(error?.message || "Ошибка изменения роли");
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-purple-500/20 text-purple-400">Админ</Badge>;
      case 'moderator':
        return <Badge className="bg-blue-500/20 text-blue-400">Модератор</Badge>;
      default:
        return <Badge variant="secondary">Пользователь</Badge>;
    }
  };

  const handleExtendAllPremium = async () => {
    if (!Number.isInteger(extendHours) || extendHours < 1 || extendHours > 8760) {
      toast.error("Часы должны быть целым числом от 1 до 8760");
      return;
    }
    if (!extendConfirmed) {
      toast.error("Подтвердите действие");
      return;
    }
    setExtendLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'extend_all_premium', hours: extendHours },
      });
      if (error) throw error;
      const affected = (data as { affected?: number })?.affected ?? 0;
      toast.success(`Продлено подписок: ${affected}`);
      setShowExtendModal(false);
      setExtendConfirmed(false);
      loadUsers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка продления';
      toast.error(msg);
    } finally {
      setExtendLoading(false);
    }
  };

  const exportUsersCSV = () => {
    if (filteredUsers.length === 0) {
      toast.error("Нет данных для экспорта");
      return;
    }
    const escape = (v: unknown): string => {
      if (v == null) return "";
      const s = String(v);
      if (/[",\n\r;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const headers = ["user_id", "display_name", "username", "created_at", "role", "plan", "is_premium", "blocked", "warnings", "posts_count", "ai_messages_count"];
    const lines = [headers.join(",")];
    for (const u of filteredUsers) {
      lines.push([
        u.user_id,
        u.display_name ?? "",
        u.username ?? "",
        u.created_at,
        u.role,
        u.subscription_status ?? "free",
        isPremium(u) ? "yes" : "no",
        u.blocked_at ? "yes" : "no",
        u.community_warnings_count,
        u.posts_count,
        u.ai_messages_count,
      ].map(escape).join(","));
    }
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `users_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success(`Экспортировано: ${filteredUsers.length}`);
    // Audit log (152-FZ): bulk PII export.
    supabase.functions.invoke('admin-users', {
      body: { action: 'log_pii_access', targetUserId: '00000000-0000-0000-0000-000000000000', resource: 'export_csv', details: { count: filteredUsers.length } },
    }).catch(() => {});
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

            <Button variant="outline" size="icon" onClick={loadUsers} disabled={loading} aria-label="Обновить список пользователей">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>

            <Button variant="outline" onClick={exportUsersCSV} disabled={loading || filteredUsers.length === 0} aria-label="Экспортировать в CSV">
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>

            {isAdmin && (
              <>
                <Button
                  variant="outline"
                  onClick={() => { setExtendConfirmed(false); setShowExtendModal(true); }}
                  aria-label="Продлить премиум всем"
                >
                  <Crown className="h-4 w-4 mr-2 text-amber-400" />
                  Продлить премиум
                </Button>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Создать
                </Button>
              </>
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
                <TableHead>Тариф</TableHead>
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
                            onClick={() => openEditModal(user)}
                            title="Редактировать (имя / email / пароль)"
                          >
                            <Pencil className="h-4 w-4 text-cyan-400" />
                          </Button>
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
      {/* Bulk extend premium modal */}
      <Dialog open={showExtendModal} onOpenChange={(open) => { if (!extendLoading) { setShowExtendModal(open); if (!open) setExtendConfirmed(false); } }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-400" />
              Продлить премиум всем
            </DialogTitle>
            <DialogDescription>
              Будут продлены все активные премиум-подписки на указанное число часов.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="extendHours">Часы для продления (1–8760)</Label>
              <Input
                id="extendHours"
                type="number"
                min={1}
                max={8760}
                step={1}
                value={extendHours}
                onChange={(e) => setExtendHours(parseInt(e.target.value, 10) || 0)}
                disabled={extendLoading}
              />
              <p className="text-xs text-muted-foreground">
                Например: 24 — на сутки, 168 — на неделю, 720 — на месяц.
              </p>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Checkbox
                id="extendConfirm"
                checked={extendConfirmed}
                onCheckedChange={(checked) => setExtendConfirmed(checked === true)}
                disabled={extendLoading}
              />
              <Label htmlFor="extendConfirm" className="font-medium cursor-pointer leading-snug">
                Я понимаю, что действие затронет всех премиум-пользователей
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExtendModal(false)} disabled={extendLoading}>
              Отмена
            </Button>
            <Button onClick={handleExtendAllPremium} disabled={extendLoading || !extendConfirmed}>
              {extendLoading ? 'Продление...' : 'Продлить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit user modal */}
      <Dialog open={!!editUserTarget} onOpenChange={(open) => { if (!open) closeEditModal(); }}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-cyan-400" />
              Редактировать пользователя
            </DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">
                {editUserTarget?.display_name || editUserTarget?.username || editUserTarget?.user_id}
              </span>
              <span className="block text-xs text-muted-foreground mt-1">
                Email и пароль меняются мгновенно, без письма пользователю. Заполните только то, что нужно изменить.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editDisplayName">Псевдоним</Label>
              <Input
                id="editDisplayName"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                placeholder="Имя пользователя"
                maxLength={80}
                disabled={editLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editEmail">Новый email</Label>
              <Input
                id="editEmail"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="Оставьте пустым, чтобы не менять"
                disabled={editLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editPassword">Новый пароль</Label>
              <div className="flex gap-2">
                <Input
                  id="editPassword"
                  type={showEditPassword ? 'text' : 'password'}
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Минимум 6 символов; пусто — не менять"
                  disabled={editLoading}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditPassword((v) => !v)}
                  disabled={editLoading}
                >
                  {showEditPassword ? 'Скрыть' : 'Показать'}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeEditModal} disabled={editLoading}>
              Отмена
            </Button>
            <Button onClick={saveEditUser} disabled={editLoading}>
              {editLoading ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
