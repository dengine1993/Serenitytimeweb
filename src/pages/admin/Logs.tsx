import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ScrollText,
  RefreshCw,
  Search,
  Shield,
  Brain,
  FileCheck,
  Activity,
  Filter,
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { toast } from "sonner";

interface AdminLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: unknown;
  created_at: string;
  admin_name?: string;
}

interface ModerationLog {
  id: string;
  moderator_id: string;
  user_id: string;
  action_type: string;
  content_type: string | null;
  content_preview: string | null;
  reason: string | null;
  created_at: string;
  moderator_name?: string;
  user_name?: string;
}

interface LLMUsageLog {
  id: string;
  user_id: string;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_rub: number | null;
  created_at: string;
  user_name?: string;
}

interface ConsentLog {
  id: string;
  user_id: string;
  consent_type: string;
  document_version: string;
  context: string;
  action: string;
  created_at: string;
  user_name?: string;
}

type LogType = "admin" | "moderation" | "llm" | "consent";

export default function AdminLogs() {
  const [activeTab, setActiveTab] = useState<LogType>("admin");
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [moderationLogs, setModerationLogs] = useState<ModerationLog[]>([]);
  const [llmLogs, setLLMUsageLogs] = useState<LLMUsageLog[]>([]);
  const [consentLogs, setConsentLogs] = useState<ConsentLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");

  useEffect(() => {
    loadLogs();
  }, [activeTab]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case "admin":
          await loadAdminLogs();
          break;
        case "moderation":
          await loadModerationLogs();
          break;
        case "llm":
          await loadLLMUsageLogs();
          break;
        case "consent":
          await loadConsentLogs();
          break;
      }
    } catch (error) {
      console.error("Error loading logs:", error);
      toast.error("Ошибка загрузки логов");
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (type: LogType) => {
    const { data, error } = await supabase.functions.invoke("admin-logs", {
      body: { type, limit: 200 },
    });
    if (error) throw error;
    return (data?.logs || []) as any[];
  };

  const loadAdminLogs = async () => {
    setAdminLogs((await fetchLogs("admin")) as AdminLog[]);
  };

  const loadModerationLogs = async () => {
    setModerationLogs((await fetchLogs("moderation")) as ModerationLog[]);
  };

  const loadLLMUsageLogs = async () => {
    setLLMUsageLogs((await fetchLogs("llm")) as LLMUsageLog[]);
  };

  const loadConsentLogs = async () => {
    setConsentLogs((await fetchLogs("consent")) as ConsentLog[]);
  };

  const getActionColor = (action: string) => {
    if (action.includes("delete")) return "destructive";
    if (action.includes("ban") || action.includes("block")) return "destructive";
    if (action.includes("warning")) return "default";
    if (action.includes("create") || action.includes("add")) return "default";
    return "secondary";
  };

  const filteredAdminLogs = adminLogs.filter((log) => {
    if (searchQuery && !JSON.stringify(log).toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (actionFilter !== "all" && !log.action.includes(actionFilter)) {
      return false;
    }
    return true;
  });

  return (
    <AdminLayout
      title="Логи системы"
      description="Просмотр всех логов и действий в системе"
      
    >
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as LogType)}>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <TabsList>
            <TabsTrigger value="admin" className="gap-2">
              <Shield className="h-4 w-4" />
              Админ логи
            </TabsTrigger>
            <TabsTrigger value="moderation" className="gap-2">
              <ScrollText className="h-4 w-4" />
              Модерация
            </TabsTrigger>
            <TabsTrigger value="llm" className="gap-2">
              <Brain className="h-4 w-4" />
              LLM Usage
            </TabsTrigger>
            <TabsTrigger value="consent" className="gap-2">
              <FileCheck className="h-4 w-4" />
              Согласия
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-[200px]"
              />
            </div>
            <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        <TabsContent value="admin">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Действия администраторов
                  <Badge variant="outline">{filteredAdminLogs.length}</Badge>
                </CardTitle>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-[150px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Фильтр" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все действия</SelectItem>
                    <SelectItem value="delete">Удаление</SelectItem>
                    <SelectItem value="update">Изменение</SelectItem>
                    <SelectItem value="create">Создание</SelectItem>
                    <SelectItem value="ban">Баны</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
                  ) : filteredAdminLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">Нет логов</div>
                  ) : (
                    filteredAdminLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={getActionColor(log.action) as "default" | "destructive" | "secondary"}>
                              {log.action}
                            </Badge>
                            <span className="text-sm font-medium">{log.admin_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(log.created_at), "dd.MM.yyyy HH:mm:ss", { locale: ru })}
                            </span>
                          </div>
                          {log.target_type && (
                            <p className="text-sm text-muted-foreground">
                              {log.target_type}: {log.target_id?.slice(0, 8)}...
                            </p>
                          )}
                          {log.details && (
                            <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto max-h-20">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="moderation">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <ScrollText className="h-5 w-5" />
                История модерации
                <Badge variant="outline">{moderationLogs.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
                  ) : moderationLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">Нет записей</div>
                  ) : (
                    moderationLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={getActionColor(log.action_type) as "default" | "destructive" | "secondary"}>
                              {log.action_type}
                            </Badge>
                            <span className="text-sm">
                              <span className="font-medium">{log.moderator_name}</span>
                              {" → "}
                              <span className="text-muted-foreground">{log.user_name}</span>
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(log.created_at), "dd.MM.yyyy HH:mm", { locale: ru })}
                            </span>
                          </div>
                          {log.reason && (
                            <p className="text-sm text-muted-foreground">Причина: {log.reason}</p>
                          )}
                          {log.content_preview && (
                            <p className="text-xs bg-muted p-2 rounded mt-1 truncate">
                              {log.content_preview}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="llm">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Использование LLM
                <Badge variant="outline">{llmLogs.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
                  ) : llmLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">Нет записей</div>
                  ) : (
                    llmLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <Activity className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{log.model || "unknown"}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(log.created_at), "dd.MM HH:mm", { locale: ru })}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              User: {log.user_id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <div className="font-mono">
                            {log.input_tokens || 0} → {log.output_tokens || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ₽{(log.cost_rub || 0).toFixed(4)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consent">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Логи согласий
                <Badge variant="outline">{consentLogs.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
                  ) : consentLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">Нет записей</div>
                  ) : (
                    consentLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50"
                      >
                        <FileCheck className="h-4 w-4 text-green-500 mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge variant="outline">{log.consent_type}</Badge>
                            <Badge variant="secondary">{log.action}</Badge>
                            <span className="text-xs text-muted-foreground">
                              v{log.document_version}
                            </span>
                          </div>
                          <p className="text-sm">
                            <span className="font-medium">{log.user_name || "Unknown"}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {log.user_id?.slice(0, 8)}...
                            </span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Контекст: {log.context}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(log.created_at), "dd.MM.yyyy HH:mm:ss", { locale: ru })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
