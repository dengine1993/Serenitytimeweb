import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trash2, Eye, Check, RefreshCw, ShieldOff, MessageSquare, FileText, AlertCircle, Radio, UserX } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ModerationHistoryPanel } from "@/components/admin/ModerationHistoryPanel";
import { ModerationActionSelect, getBanDuration, type ModerationActionType } from "@/components/admin/ModerationActionSelect";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useModerationRealtime } from "@/hooks/useModerationRealtime";
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

interface Report {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  message_id: string;
  reporter_id: string;
  // Joined data
  message_content?: string;
  message_user_id?: string;
  message_user_name?: string;
  reporter_name?: string;
}

interface PostReport {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  post_id: string;
  reporter_id: string;
  // Joined data
  post_content?: string;
  post_user_id?: string;
  post_user_name?: string;
  reporter_name?: string;
}

interface CommentReport {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  comment_id: string;
  reporter_id: string;
  // Joined data
  comment_content?: string;
  comment_user_id?: string;
  comment_user_name?: string;
  reporter_name?: string;
}

interface UserReport {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  reporter_id: string;
  reported_user_id: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  resolution_notes: string | null;
  // Joined data
  reporter_name?: string;
  reported_user_name?: string;
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
  type: 'post' | 'message' | 'report' | 'comment';
  id: string;
  content: string;
  userId: string;
  userName: string | null;
  createdAt: string;
  emotion?: string | null;
  room?: string | null;
  reportReason?: string;
  reportDetails?: string | null;
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
  const [reports, setReports] = useState<Report[]>([]);
  const [postReports, setPostReports] = useState<PostReport[]>([]);
  const [commentReports, setCommentReports] = useState<CommentReport[]>([]);
  const [userReports, setUserReports] = useState<UserReport[]>([]);
  const [communityMessages, setCommunityMessages] = useState<CommunityMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  
  // Content preview modal
  const [previewContent, setPreviewContent] = useState<ContentPreview | null>(null);
  
  // Moderation modal
  const [moderationContent, setModerationContent] = useState<ContentPreview | null>(null);
  const [userModerationData, setUserModerationData] = useState<UserModerationData | null>(null);
  const [selectedAction, setSelectedAction] = useState<ModerationActionType>('warning');
  const [moderationReason, setModerationReason] = useState('');
  const [isApplyingAction, setIsApplyingAction] = useState(false);
  const [deleteContentAfter, setDeleteContentAfter] = useState(true);

  // Realtime subscription for new reports
  const handleNewReport = useCallback(() => {
    loadReports();
    loadPostReports();
    loadCommentReports();
    loadUserReports();
    setIsRealtimeActive(true);
    setTimeout(() => setIsRealtimeActive(false), 2000);
  }, []);

  useModerationRealtime({
    onNewMessageReport: handleNewReport,
    onNewPostReport: handleNewReport,
    onNewCommentReport: handleNewReport
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([loadPosts(), loadReports(), loadPostReports(), loadCommentReports(), loadUserReports(), loadCommunityMessages()]);
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

  const loadReports = async () => {
    try {
      const { data, error } = await supabase
        .from("message_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Enrich reports with message content and user names
      const enrichedReports = await Promise.all((data || []).map(async (report) => {
        // Get message content
        const { data: msgData } = await supabase
          .from("community_messages")
          .select("content, user_id")
          .eq("id", report.message_id)
          .maybeSingle();

        let messageUserName: string | null = null;
        if (msgData?.user_id) {
          const { data: msgUserProfile } = await supabase
            .from("profiles")
            .select("display_name, username")
            .eq("user_id", msgData.user_id)
            .maybeSingle();
          messageUserName = msgUserProfile?.display_name || msgUserProfile?.username || null;
        }

        // Get reporter name
        const { data: reporterData } = await supabase
          .from("profiles")
          .select("display_name, username")
          .eq("user_id", report.reporter_id)
          .maybeSingle();

        return {
          ...report,
          message_content: msgData?.content || '[Сообщение удалено]',
          message_user_id: msgData?.user_id || null,
          message_user_name: messageUserName,
          reporter_name: reporterData?.display_name || reporterData?.username || null
        };
      }));

      setReports(enrichedReports);
    } catch (error) {
      console.error("Error loading reports:", error);
    }
  };

  const loadPostReports = async () => {
    try {
      const { data, error } = await supabase
        .from("post_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Enrich post reports with post content and user names
      const enrichedReports = await Promise.all((data || []).map(async (report) => {
        // Get post content
        const { data: postData } = await supabase
          .from("posts")
          .select("content, user_id")
          .eq("id", report.post_id)
          .maybeSingle();

        let postUserName: string | null = null;
        if (postData?.user_id) {
          const { data: postUserProfile } = await supabase
            .from("profiles")
            .select("display_name, username")
            .eq("user_id", postData.user_id)
            .maybeSingle();
          postUserName = postUserProfile?.display_name || postUserProfile?.username || null;
        }

        // Get reporter name
        const { data: reporterData } = await supabase
          .from("profiles")
          .select("display_name, username")
          .eq("user_id", report.reporter_id)
          .maybeSingle();

        return {
          ...report,
          post_content: postData?.content || '[Пост удалён]',
          post_user_id: postData?.user_id || null,
          post_user_name: postUserName,
          reporter_name: reporterData?.display_name || reporterData?.username || null
        };
      }));

      setPostReports(enrichedReports);
    } catch (error) {
      console.error("Error loading post reports:", error);
    }
  };

  const loadCommentReports = async () => {
    try {
      const { data, error } = await supabase
        .from("comment_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Enrich comment reports with comment content and user names
      const enrichedReports = await Promise.all((data || []).map(async (report) => {
        // Get comment content
        const { data: commentData } = await supabase
          .from("post_comments")
          .select("content, user_id")
          .eq("id", report.comment_id)
          .maybeSingle();

        let commentUserName: string | null = null;
        if (commentData?.user_id) {
          const { data: commentUserProfile } = await supabase
            .from("profiles")
            .select("display_name, username")
            .eq("user_id", commentData.user_id)
            .maybeSingle();
          commentUserName = commentUserProfile?.display_name || commentUserProfile?.username || null;
        }

        // Get reporter name
        const { data: reporterData } = await supabase
          .from("profiles")
          .select("display_name, username")
          .eq("user_id", report.reporter_id)
          .maybeSingle();

        return {
          ...report,
          comment_content: commentData?.content || '[Комментарий удалён]',
          comment_user_id: commentData?.user_id || null,
          comment_user_name: commentUserName,
          reporter_name: reporterData?.display_name || reporterData?.username || null
        };
      }));

      setCommentReports(enrichedReports);
    } catch (error) {
      console.error("Error loading comment reports:", error);
    }
  };

  const loadUserReports = async () => {
    try {
      const { data, error } = await supabase
        .from("user_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Enrich user reports with user names
      const enrichedReports = await Promise.all((data || []).map(async (report) => {
        // Get reported user name
        const { data: reportedUserData } = await supabase
          .from("profiles")
          .select("display_name, username")
          .eq("user_id", report.reported_user_id)
          .maybeSingle();

        // Get reporter name
        const { data: reporterData } = await supabase
          .from("profiles")
          .select("display_name, username")
          .eq("user_id", report.reporter_id)
          .maybeSingle();

        return {
          ...report,
          reported_user_name: reportedUserData?.display_name || reportedUserData?.username || null,
          reporter_name: reporterData?.display_name || reporterData?.username || null
        };
      }));

      setUserReports(enrichedReports);
    } catch (error) {
      console.error("Error loading user reports:", error);
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

  const deletePost = async (postId: string, authorId: string) => {
    if (!confirm("Удалить этот пост?")) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from("admin_logs").insert({
        admin_id: user?.id,
        action: "delete_post",
        target_type: "post",
        target_id: postId,
      });

      const { error } = await supabase.from("posts").delete().eq("id", postId);
      if (error) throw error;

      toast.success("Пост удалён");
      loadPosts();
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Ошибка удаления");
    }
  };

  const deleteCommunityMessage = async (messageId: string, authorId: string) => {
    if (!confirm("Удалить это сообщение?")) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from("admin_logs").insert({
        admin_id: user?.id,
        action: "delete_community_message",
        target_type: "community_message",
        target_id: messageId,
      });

      const { error } = await supabase.from("community_messages").delete().eq("id", messageId);
      if (error) throw error;

      toast.success("Сообщение удалено");
      loadCommunityMessages();
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Ошибка удаления");
    }
  };

  const deleteComment = async (commentId: string, authorId: string) => {
    if (!confirm("Удалить этот комментарий?")) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from("admin_logs").insert({
        admin_id: user?.id,
        action: "delete_comment",
        target_type: "post_comment",
        target_id: commentId,
      });

      const { error } = await supabase.from("post_comments").delete().eq("id", commentId);
      if (error) throw error;

      toast.success("Комментарий удалён");
      loadCommentReports();
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Ошибка удаления");
    }
  };

  const markReportReviewed = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from("message_reports")
        .update({ status: "reviewed" })
        .eq("id", reportId);

      if (error) throw error;

      toast.success("Жалоба обработана");
      loadReports();
    } catch (error) {
      console.error("Error updating report:", error);
      toast.error("Ошибка");
    }
  };

  const markPostReportReviewed = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from("post_reports")
        .update({ status: "reviewed" })
        .eq("id", reportId);

      if (error) throw error;

      toast.success("Жалоба обработана");
      loadPostReports();
    } catch (error) {
      console.error("Error updating post report:", error);
      toast.error("Ошибка");
    }
  };

  const markCommentReportReviewed = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from("comment_reports")
        .update({ status: "reviewed" })
        .eq("id", reportId);

      if (error) throw error;

      toast.success("Жалоба обработана");
      loadCommentReports();
    } catch (error) {
      console.error("Error updating comment report:", error);
      toast.error("Ошибка");
    }
  };

  const markUserReportReviewed = async (reportId: string, resolution?: string) => {
    try {
      const { data: { user: moderator } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("user_reports")
        .update({ 
          status: "reviewed",
          reviewed_by: moderator?.id,
          reviewed_at: new Date().toISOString(),
          resolution_notes: resolution || null
        })
        .eq("id", reportId);

      if (error) throw error;

      toast.success("Жалоба обработана");
      loadUserReports();
    } catch (error) {
      console.error("Error updating comment report:", error);
      toast.error("Ошибка");
    }
  };

  const openPreview = (content: ContentPreview) => {
    setPreviewContent(content);
  };

  const openModerationModal = async (content: ContentPreview) => {
    setModerationContent(content);
    setSelectedAction('warning');
    setModerationReason('');
    setDeleteContentAfter(true);
    
    // Fetch user moderation data
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
      const { data: { user: moderator } } = await supabase.auth.getUser();
      const targetUserId = moderationContent.userId;
      
      let updateData: Record<string, unknown> = {};
      let notificationTitle = '';
      let notificationMessage = '';
      
      switch (selectedAction) {
        case 'warning':
          updateData = {
            community_warnings_count: (userModerationData.community_warnings_count || 0) + 1,
            last_community_warning_at: new Date().toISOString()
          };
          notificationTitle = 'Предупреждение';
          notificationMessage = `Вы получили предупреждение за нарушение правил. ${moderationReason ? `Причина: ${moderationReason}` : ''}`;
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
            temp_bans_count: (userModerationData.temp_bans_count || 0) + 1
          };
          
          const durationLabel = hours === 24 ? '24 часа' : hours === 72 ? '3 дня' : '7 дней';
          notificationTitle = 'Временное ограничение';
          notificationMessage = `Доступ к сообществу ограничен на ${durationLabel}. ${moderationReason ? `Причина: ${moderationReason}` : ''}`;
          break;
        }
          
        case 'permanent_ban':
          updateData = {
            blocked_at: new Date().toISOString()
          };
          notificationTitle = 'Аккаунт заблокирован';
          notificationMessage = `Ваш аккаунт заблокирован. ${moderationReason ? `Причина: ${moderationReason}` : ''}`;
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
      
      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', targetUserId);
      
      if (updateError) throw updateError;
      
      // Create notification
      await supabase.from('notifications').insert({
        user_id: targetUserId,
        type: 'moderation',
        title: notificationTitle,
        message: notificationMessage
      });
      
      // Log in moderation_history with content preview
      await supabase.from('moderation_history').insert({
        user_id: targetUserId,
        moderator_id: moderator?.id,
        action_type: selectedAction,
        reason: moderationReason || null,
        content_type: moderationContent.type,
        content_preview: moderationContent.content.slice(0, 200)
      });
      
      // Log admin action
      await supabase.from('admin_logs').insert({
        admin_id: moderator?.id,
        action: selectedAction,
        target_type: 'user',
        target_id: targetUserId,
        details: {
          reason: moderationReason,
          content_type: moderationContent.type,
          content_id: moderationContent.id
        }
      });

      // Delete content if requested
      if (deleteContentAfter && selectedAction !== 'restriction_lifted') {
        if (moderationContent.type === 'post') {
          await supabase.from("posts").delete().eq("id", moderationContent.id);
        } else if (moderationContent.type === 'message') {
          await supabase.from("community_messages").delete().eq("id", moderationContent.id);
        } else if (moderationContent.type === 'comment') {
          await supabase.from("post_comments").delete().eq("id", moderationContent.id);
        }
      }
      
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
      loadAllData();
      
    } catch (error) {
      console.error("Error applying moderation action:", error);
      toast.error("Ошибка применения действия");
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
    <AdminLayout title="Модерация контента" description="Модерация постов, сообщений и обработка жалоб">
      <Tabs defaultValue="posts">
        <div className="flex justify-between items-center mb-6">
          <TabsList className="bg-card/50">
            <TabsTrigger value="posts" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Посты ({posts.length})
            </TabsTrigger>
            <TabsTrigger value="message-reports" className="flex items-center gap-2 relative">
              <AlertCircle className={`h-4 w-4 ${isRealtimeActive ? 'text-amber-400 animate-pulse' : ''}`} />
              Жалобы на чат ({reports.filter(r => r.status === 'pending').length})
              {isRealtimeActive && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full animate-ping" />
              )}
            </TabsTrigger>
            <TabsTrigger value="post-reports" className="flex items-center gap-2 relative">
              <AlertCircle className={`h-4 w-4 ${isRealtimeActive ? 'text-amber-400 animate-pulse' : ''}`} />
              Жалобы на посты ({postReports.filter(r => r.status === 'pending').length})
              {isRealtimeActive && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full animate-ping" />
              )}
            </TabsTrigger>
            <TabsTrigger value="comment-reports" className="flex items-center gap-2 relative">
              <AlertCircle className={`h-4 w-4 ${isRealtimeActive ? 'text-amber-400 animate-pulse' : ''}`} />
              Жалобы на комменты ({commentReports.filter(r => r.status === 'pending').length})
              {isRealtimeActive && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full animate-ping" />
              )}
            </TabsTrigger>
            <TabsTrigger value="user-reports" className="flex items-center gap-2 relative">
              <UserX className={`h-4 w-4 ${isRealtimeActive ? 'text-red-400 animate-pulse' : ''}`} />
              Жалобы на юзеров ({userReports.filter(r => r.status === 'pending').length})
              {isRealtimeActive && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-400 rounded-full animate-ping" />
              )}
            </TabsTrigger>
            <TabsTrigger value="community" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Чат ({communityMessages.length})
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            {/* Realtime indicator */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20">
              <Radio className="h-3 w-3 text-green-400" />
              <span className="text-xs text-green-400">Live</span>
            </div>
            
            <Button variant="outline" size="sm" onClick={loadAllData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Обновить
            </Button>
          </div>
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
                        <div className="font-medium text-sm">
                          {getUserName(post.profiles || null)}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {post.user_id.slice(0, 8)}...
                        </div>
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
                            variant="ghost"
                            size="icon"
                            onClick={() => openPreview({
                              type: 'post',
                              id: post.id,
                              content: post.content,
                              userId: post.user_id,
                              userName: getUserName(post.profiles || null),
                              createdAt: post.created_at,
                              emotion: post.emotion
                            })}
                            title="Просмотр"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openModerationModal({
                              type: 'post',
                              id: post.id,
                              content: post.content,
                              userId: post.user_id,
                              userName: getUserName(post.profiles || null),
                              createdAt: post.created_at,
                              emotion: post.emotion
                            })}
                            title="Модерация"
                          >
                            <ShieldOff className="h-4 w-4 text-amber-400" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deletePost(post.id, post.user_id)}
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
                <div className="p-8 text-center text-muted-foreground">
                  Постов нет
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Message Reports tab */}
        <TabsContent value="message-reports">
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead>Жалоба от</TableHead>
                    <TableHead className="w-[30%]">Сообщение</TableHead>
                    <TableHead>Причина</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id} className="border-border/50">
                      <TableCell>
                        <div className="font-medium text-sm">
                          {report.reporter_name || 'Аноним'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(report.created_at), "dd MMM, HH:mm", { locale: ru })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="line-clamp-2 text-sm">{report.message_content}</p>
                          {report.message_user_name && (
                            <p className="text-xs text-muted-foreground">
                              Автор: {report.message_user_name}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{report.reason}</Badge>
                        {report.details && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {report.details}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        {report.status === 'pending' ? (
                          <Badge className="bg-yellow-500/20 text-yellow-400">Ожидает</Badge>
                        ) : (
                          <Badge variant="secondary">Обработано</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {report.message_user_id && report.message_content !== '[Сообщение удалено]' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openModerationModal({
                                type: 'message',
                                id: report.message_id,
                                content: report.message_content || '',
                                userId: report.message_user_id!,
                                userName: report.message_user_name || null,
                                createdAt: report.created_at,
                                reportReason: report.reason,
                                reportDetails: report.details
                              })}
                              title="Модерация автора"
                            >
                              <ShieldOff className="h-4 w-4 text-amber-400" />
                            </Button>
                          )}
                          {report.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => markReportReviewed(report.id)}
                              title="Обработано"
                            >
                              <Check className="h-4 w-4 text-green-400" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {reports.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  Жалоб на сообщения нет
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Post Reports tab */}
        <TabsContent value="post-reports">
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead>Жалоба от</TableHead>
                    <TableHead className="w-[30%]">Пост</TableHead>
                    <TableHead>Причина</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {postReports.map((report) => (
                    <TableRow key={report.id} className="border-border/50">
                      <TableCell>
                        <div className="font-medium text-sm">
                          {report.reporter_name || 'Аноним'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(report.created_at), "dd MMM, HH:mm", { locale: ru })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="line-clamp-2 text-sm">{report.post_content}</p>
                          {report.post_user_name && (
                            <p className="text-xs text-muted-foreground">
                              Автор: {report.post_user_name}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{report.reason}</Badge>
                        {report.details && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {report.details}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        {report.status === 'pending' ? (
                          <Badge className="bg-yellow-500/20 text-yellow-400">Ожидает</Badge>
                        ) : (
                          <Badge variant="secondary">Обработано</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {report.post_user_id && report.post_content !== '[Пост удалён]' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openModerationModal({
                                type: 'post',
                                id: report.post_id,
                                content: report.post_content || '',
                                userId: report.post_user_id!,
                                userName: report.post_user_name || null,
                                createdAt: report.created_at,
                                reportReason: report.reason,
                                reportDetails: report.details
                              })}
                              title="Модерация автора"
                            >
                              <ShieldOff className="h-4 w-4 text-amber-400" />
                            </Button>
                          )}
                          {report.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => markPostReportReviewed(report.id)}
                              title="Обработано"
                            >
                              <Check className="h-4 w-4 text-green-400" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {postReports.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  Жалоб на посты нет
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comment Reports tab */}
        <TabsContent value="comment-reports">
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead>Жалоба от</TableHead>
                    <TableHead className="w-[30%]">Комментарий</TableHead>
                    <TableHead>Причина</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commentReports.map((report) => (
                    <TableRow key={report.id} className="border-border/50">
                      <TableCell>
                        <div className="font-medium text-sm">
                          {report.reporter_name || 'Аноним'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(report.created_at), "dd MMM, HH:mm", { locale: ru })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="line-clamp-2 text-sm">{report.comment_content}</p>
                          {report.comment_user_name && (
                            <p className="text-xs text-muted-foreground">
                              Автор: {report.comment_user_name}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{report.reason}</Badge>
                        {report.details && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {report.details}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        {report.status === 'pending' ? (
                          <Badge className="bg-yellow-500/20 text-yellow-400">Ожидает</Badge>
                        ) : (
                          <Badge variant="secondary">Обработано</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {report.comment_user_id && report.comment_content !== '[Комментарий удалён]' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openModerationModal({
                                type: 'message',
                                id: report.comment_id,
                                content: report.comment_content || '',
                                userId: report.comment_user_id!,
                                userName: report.comment_user_name || null,
                                createdAt: report.created_at,
                                reportReason: report.reason,
                                reportDetails: report.details
                              })}
                              title="Модерация автора"
                            >
                              <ShieldOff className="h-4 w-4 text-amber-400" />
                            </Button>
                          )}
                          {report.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => markCommentReportReviewed(report.id)}
                              title="Обработано"
                            >
                              <Check className="h-4 w-4 text-green-400" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {commentReports.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  Жалоб на комментарии нет
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Reports tab */}
        <TabsContent value="user-reports">
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead>Жалоба от</TableHead>
                    <TableHead>На пользователя</TableHead>
                    <TableHead>Причина</TableHead>
                    <TableHead>Подробности</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userReports.map((report) => (
                    <TableRow key={report.id} className="border-border/50">
                      <TableCell>
                        <div className="font-medium text-sm">
                          {report.reporter_name || 'Аноним'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(report.created_at), "dd MMM, HH:mm", { locale: ru })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm text-red-400">
                          {report.reported_user_name || 'Неизвестно'}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {report.reported_user_id.slice(0, 8)}...
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-red-400 border-red-400/50">
                          {report.reason === 'harassment' && 'Оскорбления'}
                          {report.reason === 'spam' && 'Спам'}
                          {report.reason === 'inappropriate' && 'Неподобающий контент'}
                          {report.reason === 'impersonation' && 'Выдаёт себя за другого'}
                          {report.reason === 'threats' && 'Угрозы'}
                          {report.reason === 'other' && 'Другое'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {report.details ? (
                          <p className="text-xs text-muted-foreground line-clamp-2 max-w-[200px]">
                            {report.details}
                          </p>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {report.status === 'pending' ? (
                          <Badge className="bg-red-500/20 text-red-400">Ожидает</Badge>
                        ) : (
                          <Badge variant="secondary">Обработано</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openModerationModal({
                              type: 'report',
                              id: report.id,
                              content: `Жалоба на пользователя: ${report.reported_user_name || 'Неизвестно'}`,
                              userId: report.reported_user_id,
                              userName: report.reported_user_name || null,
                              createdAt: report.created_at,
                              reportReason: report.reason,
                              reportDetails: report.details
                            })}
                            title="Модерация пользователя"
                          >
                            <ShieldOff className="h-4 w-4 text-amber-400" />
                          </Button>
                          {report.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => markUserReportReviewed(report.id)}
                              title="Обработано"
                            >
                              <Check className="h-4 w-4 text-green-400" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {userReports.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  Жалоб на пользователей нет
                </div>
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
                        <div className="font-medium text-sm">
                          {getUserName(msg.profiles)}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {msg.user_id.slice(0, 8)}...
                        </div>
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
                            variant="ghost"
                            size="icon"
                            onClick={() => openPreview({
                              type: 'message',
                              id: msg.id,
                              content: msg.content,
                              userId: msg.user_id,
                              userName: getUserName(msg.profiles),
                              createdAt: msg.created_at,
                              room: msg.room
                            })}
                            title="Просмотр"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openModerationModal({
                              type: 'message',
                              id: msg.id,
                              content: msg.content,
                              userId: msg.user_id,
                              userName: getUserName(msg.profiles),
                              createdAt: msg.created_at,
                              room: msg.room
                            })}
                            title="Модерация"
                          >
                            <ShieldOff className="h-4 w-4 text-amber-400" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteCommunityMessage(msg.id, msg.user_id)}
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
                <div className="p-8 text-center text-muted-foreground">
                  Сообщений нет
                </div>
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
            {previewContent?.emotion && (
              <Badge variant="secondary">Эмоция: {previewContent.emotion}</Badge>
            )}
            {previewContent?.room && (
              <Badge variant="outline">Комната: {previewContent.room}</Badge>
            )}
            
            <ScrollArea className="h-[300px]">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="whitespace-pre-wrap">{previewContent?.content}</p>
              </div>
            </ScrollArea>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewContent(null)}>
              Закрыть
            </Button>
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
              {/* Content preview */}
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
                {moderationContent.reportReason && (
                  <div className="mt-2 p-2 bg-red-500/10 rounded border border-red-500/20">
                    <p className="text-xs text-red-400">
                      <strong>Жалоба:</strong> {moderationContent.reportReason}
                      {moderationContent.reportDetails && ` — ${moderationContent.reportDetails}`}
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Moderation history */}
              <div>
                <h4 className="text-sm font-medium mb-2">📋 История модерации пользователя</h4>
                <ModerationHistoryPanel userId={moderationContent.userId} />
              </div>

              <Separator />

              {/* Action selection */}
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
    </AdminLayout>
  );
}
