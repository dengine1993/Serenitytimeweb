import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { AlertTriangle, Ban, Clock, Shield, CheckCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface ModerationHistoryEntry {
  id: string;
  action_type: string;
  reason: string | null;
  content_type: string | null;
  content_preview: string | null;
  created_at: string;
  moderator_id: string;
  moderator_username?: string;
}

interface ModerationHistoryPanelProps {
  userId: string;
}

const actionLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  warning: { label: "Предупреждение", icon: <AlertTriangle className="h-4 w-4" />, color: "text-yellow-500" },
  temp_ban_24h: { label: "Бан 24ч", icon: <Clock className="h-4 w-4" />, color: "text-orange-500" },
  temp_ban_3d: { label: "Бан 3 дня", icon: <Clock className="h-4 w-4" />, color: "text-orange-600" },
  temp_ban_7d: { label: "Бан 7 дней", icon: <Clock className="h-4 w-4" />, color: "text-red-500" },
  permanent_ban: { label: "Вечный бан", icon: <Ban className="h-4 w-4" />, color: "text-red-600" },
  restriction_lifted: { label: "Снятие ограничений", icon: <CheckCircle className="h-4 w-4" />, color: "text-green-500" },
};

export function ModerationHistoryPanel({ userId }: ModerationHistoryPanelProps) {
  const [history, setHistory] = useState<ModerationHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [userId]);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("moderation_history")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch moderator usernames
      if (data && data.length > 0) {
        const moderatorIds = [...new Set(data.map(h => h.moderator_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, display_name")
          .in("user_id", moderatorIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p.username || p.display_name || "Unknown"]));

        const historyWithNames = data.map(h => ({
          ...h,
          moderator_username: profileMap.get(h.moderator_id) || "Unknown"
        }));

        setHistory(historyWithNames);
      } else {
        setHistory([]);
      }
    } catch (error) {
      console.error("Error loading moderation history:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
        <Shield className="h-4 w-4" />
        <span>История модерации пуста</span>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[200px] pr-4">
      <div className="space-y-3">
        {history.map((entry) => {
          const actionInfo = actionLabels[entry.action_type] || { 
            label: entry.action_type, 
            icon: <Shield className="h-4 w-4" />, 
            color: "text-muted-foreground" 
          };

          return (
            <div key={entry.id} className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
              <div className={`mt-0.5 ${actionInfo.color}`}>
                {actionInfo.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`font-medium text-sm ${actionInfo.color}`}>
                    {actionInfo.label}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(entry.created_at), "dd MMM yyyy, HH:mm", { locale: ru })}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Модератор: @{entry.moderator_username}
                </div>
                {entry.reason && (
                  <p className="text-sm text-foreground/80 mt-1 line-clamp-2">
                    {entry.reason}
                  </p>
                )}
                {entry.content_preview && (
                  <p className="text-xs text-muted-foreground mt-1 italic line-clamp-1">
                    "{entry.content_preview}"
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
