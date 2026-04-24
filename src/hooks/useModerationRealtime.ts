import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsAdmin } from "@/hooks/useIsAdmin";

interface NewReport {
  id: string;
  reason: string;
  details: string | null;
  reporter_id: string;
  created_at: string;
  message_id?: string;
  post_id?: string;
}

interface UseModerationRealtimeOptions {
  onNewMessageReport?: (report: NewReport) => void;
  onNewPostReport?: (report: NewReport) => void;
  onNewCommentReport?: (report: NewReport) => void;
}

export function useModerationRealtime(options?: UseModerationRealtimeOptions | ((report: NewReport) => void)) {
  const { isAdmin, loading } = useIsAdmin();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [newReportsCount, setNewReportsCount] = useState(0);

  const callbacks = typeof options === 'function' 
    ? { onNewMessageReport: options } 
    : options;

  useEffect(() => {
    if (loading || !isAdmin) return;

    const channel = supabase
      .channel('moderation-reports')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_reports' },
        async (payload) => {
          const newReport = payload.new as NewReport;
          setNewReportsCount(prev => prev + 1);
          
          const { data: reporter } = await supabase
            .from("profiles").select("display_name, username")
            .eq("user_id", newReport.reporter_id).maybeSingle();

          const reporterName = reporter?.display_name || reporter?.username || 'Пользователь';
          toast.warning(`Новая жалоба на сообщение`, {
            description: `От ${reporterName}: ${newReport.reason}`,
            duration: 10000,
            action: { label: "Открыть", onClick: () => { window.location.href = '/admin/moderation'; } }
          });
          callbacks?.onNewMessageReport?.(newReport);
        }
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_reports' },
        async (payload) => {
          const newReport = payload.new as NewReport;
          setNewReportsCount(prev => prev + 1);
          
          const { data: reporter } = await supabase
            .from("profiles").select("display_name, username")
            .eq("user_id", newReport.reporter_id).maybeSingle();

          const reporterName = reporter?.display_name || reporter?.username || 'Пользователь';
          toast.warning(`Новая жалоба на пост`, {
            description: `От ${reporterName}: ${newReport.reason}`,
            duration: 10000,
            action: { label: "Открыть", onClick: () => { window.location.href = '/admin/moderation'; } }
          });
          callbacks?.onNewPostReport?.(newReport);
        }
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comment_reports' },
        async (payload) => {
          const newReport = payload.new as NewReport;
          setNewReportsCount(prev => prev + 1);
          
          const { data: reporter } = await supabase
            .from("profiles").select("display_name, username")
            .eq("user_id", newReport.reporter_id).maybeSingle();

          const reporterName = reporter?.display_name || reporter?.username || 'Пользователь';
          toast.warning(`Новая жалоба на комментарий`, {
            description: `От ${reporterName}: ${newReport.reason}`,
            duration: 10000,
            action: { label: "Открыть", onClick: () => { window.location.href = '/admin/moderation'; } }
          });
          callbacks?.onNewCommentReport?.(newReport);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to moderation reports realtime');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [isAdmin, loading, callbacks?.onNewMessageReport, callbacks?.onNewPostReport, callbacks?.onNewCommentReport]);

  const resetCount = () => setNewReportsCount(0);

  return { isSubscribed: !!channelRef.current, newReportsCount, resetCount };
}
