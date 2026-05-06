import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trash2, Eye, RefreshCw, ShieldOff, MessageSquare, FileText } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ModerationHistoryPanel } from "@/components/admin/ModerationHistoryPanel";
import { ModerationActionSelect, getBanDuration, type ModerationActionType } from "@/components/admin/ModerationActionSelect";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface Post {
  id: string;
  content: string;
  emotion: string | null;
  created_at: string;
  user_id: string;
  profiles?: { display_name: string | null; username: string | null } | null;
}

interface CommunityMessage {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  room: string | null;
  profiles: { display_name: string | null; username: string | null } | null;
}

interface ContentPreview {
  type: 'post' | 'message';
  id: string;
  content: string;
  userId: string;
  userName: string | null;
  createdAt: string;
  emotion?: string | null;
  room?: string | null;
}

interface UserModerationData {
  community_warnings_count: number;
  temp_bans_count: number;
  blocked_at: string | null;
  community_restricted_until: string | null;
}

export default function AdminModeration() {
  const { isAdmin } = useIsAdmin();
  const [posts, setPosts] = useState<Post[]>([]);
  const [communityMessages, setCommunityMessages] = useState<CommunityMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const [previewContent, setPreviewContent] = useState<ContentPreview | null>(null);
  const [moderationContent, setModerationContent] = useState<ContentPreview | null>(null);
  const [userModerationData, setUserModerationData] = useState<UserModerationData | null>(null);
  const [selectedAction, setSelectedAction] = useState<ModerationActionType>('warning');
  const [moderationReason, setModerationReason] = useState('');
  const [isApplyingAction, setIsApplyingAction] = useState(false);
  const [deleteContentAfter, setDeleteContentAfter] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'post' | 'community_message'; id: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([loadPosts(), loadCommunityMessages()]);
    setLoading(false);
  };

  const loadPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("id, content, emotion, created_at, user_id, profiles:user_id(display_name, username)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      setPosts((data as unknown as Post[]) || []);
    } catch (error) {
      console.error("Error loading posts:", error);
    }
  };

  const loadCommunityMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("community_messages")
        .select("id, content, created_at, user_id, room, profiles:user_id(display_name, username)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      setCommunityMessages((data as unknown as CommunityMessage[]) || []);
    } catch (error) {
      console.error("Error loading community messages:", error);
    }
  };

  const requestDeletePost = (postId: string) => setDeleteTarget({ type: 'post', id: postId });
  const requestDeleteMessage = (messageId: string) => setDeleteTarget({ type: 'community_message', id: messageId });

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-moderation', {
        body: { mode: 'delete_content', contentType: deleteTarget.type, contentId: deleteTarget.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(deleteTarget.type === 'post' ? 'Пост удалён' : 'Сообщение удалено');
      if (deleteTarget.type === 'post') loadPosts(); else loadCommunityMessages();
      setDeleteTarget(null);
    } catch (error: any) {
      console.error("Error deleting content:", error);
      toast.error(error?.message || "Ошибка удаления");
    } finally {
      setIsDeleting(false);
    }
  };

  const openPreview = (content: ContentPreview) => setPreviewContent(content);

  const openModerationModal = async (content: ContentPreview) => {
    setModerationContent(content);
    setSelectedAction('warning');
    setModerationReason('');
    setDeleteContentAfter(true);

    const { data } = await supabase
      .from("profiles")
      .select("community_warnings_count, temp_bans_count, blocked_at, community_restricted_until")
      .eq("user_id", content.userId)
      .maybeSingle();

    setUserModerationData(data || { community_warnings_count: 0, temp_bans_count: 0, blocked_at: null, community_restricted_until: null });
  };

  const closeModerationModal = () => {
    setModerationContent(null);
    setUserModerationData(null);
    setSelectedAction('warning');
    setModerationReason('');
  };

  const applyModerationAction = async () => {
    if (!moderationContent || !userModerationData) return;
    setIsApplyingAction(true);

    try {
      const { data, error } = await supabase.functions.invoke('admin-moderation', {
        body: {
          mode: 'apply_user_action',
          userId: moderationContent.userId,
          action: selectedAction,
          reason: moderationReason || undefined,
          contentType: moderationContent.type,
          contentId: moderationContent.id,
          contentPreview: moderationContent.content.slice(0, 200),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (deleteContentAfter && selectedAction !== 'restriction_lifted') {
        const ct = moderationContent.type === 'post' ? 'post' : 'community_message';
        const del = await supabase.functions.invoke('admin-moderation', {
          body: { mode: 'delete_content', contentType: ct, contentId: moderationContent.id },
        });
        if (del.error || del.data?.error) {
          console.warn('Не удалось удалить контент:', del.error || del.data?.error);
        }
      }

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
      loadAllData();
    } catch (error: any) {
      console.error("Error applying moderation action:", error);
      toast.error(error?.message || "Ошибка применения действия");
    } finally {
      setIsApplyingAction(false);
    }
  };


  const getUserName = (profiles: { display_name: string | null; username: string | null } | null) => {
    return profiles?.display_name || profiles?.username || 'Аноним';
  };

  const isUserRestricted = (data: UserModerationData | null) => {
    if (!data?.community_restricted_until) return false;
    return new Date(data.community_restricted_until) > new Date();
  };

  return (
    <AdminLayout title="Модерация контента" description="Просмотр контента и применение действий к пользователям">
      <Tabs defaultValue="posts">
        <div className="flex justify-between items-center mb-6">
          <TabsList className="bg-card/50">
            <TabsTrigger value="posts" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Посты ({posts.length})
            </TabsTrigger>
            <TabsTrigger value="community" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Чат ({communityMessages.length})
            </TabsTrigger>
          </TabsList>

          <Button variant="outline" size="sm" onClick={loadAllData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
        </div>

        {/* Posts tab */}
        <TabsContent value="posts">
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead>Автор</TableHead>
                    <TableHead className="w-[40%]">Контент</TableHead>
                    <TableHead>Эмоция</TableHead>
                    <TableHead>Дата</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post) => (
                    <TableRow key={post.id} className="border-border/50">
                      <TableCell>
                        <div className="font-medium text-sm">{getUserName(post.profiles || null)}</div>
                        <div className="text-xs text-muted-foreground font-mono">{post.user_id.slice(0, 8)}...</div>
                      </TableCell>
                      <TableCell>
                        <p className="line-clamp-2 text-sm">{post.content}</p>
                      </TableCell>
                      <TableCell>
                        {post.emotion && <Badge variant="secondary">{post.emotion}</Badge>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(post.created_at), "dd MMM, HH:mm", { locale: ru })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => openPreview({
                              type: 'post', id: post.id, content: post.content,
                              userId: post.user_id, userName: getUserName(post.profiles || null),
                              createdAt: post.created_at, emotion: post.emotion,
                            })}
                            title="Просмотр"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => openModerationModal({
                              type: 'post', id: post.id, content: post.content,
                              userId: post.user_id, userName: getUserName(post.profiles || null),
                              createdAt: post.created_at, emotion: post.emotion,
                            })}
                            title="Модерация"
                          >
                            <ShieldOff className="h-4 w-4 text-amber-400" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => requestDeletePost(post.id)}
                            title="Удалить"
                          >
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {posts.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">Постов нет</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Community tab */}
        <TabsContent value="community">
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead>Автор</TableHead>
                    <TableHead className="w-[40%]">Сообщение</TableHead>
                    <TableHead>Комната</TableHead>
                    <TableHead>Дата</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {communityMessages.map((msg) => (
                    <TableRow key={msg.id} className="border-border/50">
                      <TableCell>
                        <div className="font-medium text-sm">{getUserName(msg.profiles)}</div>
                        <div className="text-xs text-muted-foreground font-mono">{msg.user_id.slice(0, 8)}...</div>
                      </TableCell>
                      <TableCell>
                        <p className="line-clamp-2 text-sm">{msg.content}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{msg.room || "general"}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(msg.created_at), "dd MMM, HH:mm", { locale: ru })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => openPreview({
                              type: 'message', id: msg.id, content: msg.content,
                              userId: msg.user_id, userName: getUserName(msg.profiles),
                              createdAt: msg.created_at, room: msg.room,
                            })}
                            title="Просмотр"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => openModerationModal({
                              type: 'message', id: msg.id, content: msg.content,
                              userId: msg.user_id, userName: getUserName(msg.profiles),
                              createdAt: msg.created_at, room: msg.room,
                            })}
                            title="Модерация"
                          >
                            <ShieldOff className="h-4 w-4 text-amber-400" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => requestDeleteMessage(msg.id)}
                            title="Удалить"
                          >
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {communityMessages.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">Сообщений нет</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Content preview dialog */}
      <Dialog open={!!previewContent} onOpenChange={() => setPreviewContent(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewContent?.type === 'post' ? (
                <><FileText className="h-5 w-5" /> Пост</>
              ) : (
                <><MessageSquare className="h-5 w-5" /> Сообщение</>
              )}
            </DialogTitle>
            <DialogDescription>
              Автор: {previewContent?.userName} • {previewContent && format(new Date(previewContent.createdAt), "dd MMMM yyyy, HH:mm", { locale: ru })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {previewContent?.emotion && <Badge variant="secondary">Эмоция: {previewContent.emotion}</Badge>}
            {previewContent?.room && <Badge variant="outline">Комната: {previewContent.room}</Badge>}

            <ScrollArea className="h-[300px]">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="whitespace-pre-wrap">{previewContent?.content}</p>
              </div>
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewContent(null)}>Закрыть</Button>
            <Button
              variant="default"
              onClick={() => {
                if (previewContent) {
                  setPreviewContent(null);
                  openModerationModal(previewContent);
                }
              }}
            >
              <ShieldOff className="h-4 w-4 mr-2" />
              Модерация
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Moderation action dialog */}
      <Dialog open={!!moderationContent} onOpenChange={closeModerationModal}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldOff className="h-5 w-5 text-amber-400" />
              Модерация контента
            </DialogTitle>
            <DialogDescription>
              Автор: <span className="font-medium text-foreground">{moderationContent?.userName}</span>
              {userModerationData && (
                <span className="ml-2 text-muted-foreground">
                  • Предупреждений: {userModerationData.community_warnings_count || 0}
                  • Банов: {userModerationData.temp_bans_count || 0}/3
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {moderationContent && userModerationData && (
            <div className="space-y-4 py-2">
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  {moderationContent.type === 'post' ? (
                    <><FileText className="h-4 w-4" /> Пост</>
                  ) : (
                    <><MessageSquare className="h-4 w-4" /> Сообщение</>
                  )}
                </h4>
                <div className="p-3 bg-muted/50 rounded-lg max-h-[120px] overflow-y-auto">
                  <p className="text-sm whitespace-pre-wrap">{moderationContent.content}</p>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium mb-2">📋 История модерации пользователя</h4>
                <ModerationHistoryPanel userId={moderationContent.userId} />
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium mb-3">Выберите действие</h4>
                <ModerationActionSelect
                  value={selectedAction}
                  onChange={setSelectedAction}
                  warningsCount={userModerationData.community_warnings_count || 0}
                  tempBansCount={userModerationData.temp_bans_count || 0}
                  isAdmin={isAdmin}
                  isBlocked={!!userModerationData.blocked_at}
                  isRestricted={isUserRestricted(userModerationData)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Причина (опционально)</label>
                <Textarea
                  placeholder="Укажите причину..."
                  value={moderationReason}
                  onChange={(e) => setModerationReason(e.target.value)}
                  rows={2}
                />
              </div>

              {selectedAction !== 'restriction_lifted' && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={deleteContentAfter}
                    onChange={(e) => setDeleteContentAfter(e.target.checked)}
                    className="rounded"
                  />
                  Удалить контент после применения действия
                </label>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeModerationModal}>Отмена</Button>
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
    </AdminLayout>
  );
}
