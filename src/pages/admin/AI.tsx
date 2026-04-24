import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Ban, Eye, Zap, Users, TrendingUp, Search, Copy } from "lucide-react";
import { toast } from "sonner";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface AbuserData {
  user_id: string;
  total_tokens: number;
  message_count: number;
  display_name?: string;
  username?: string;
}

interface ChatMessage {
  id: string;
  content: string;
  role: string;
  created_at: string;
}

interface AIStats {
  totalTokens: number;
  tokensToday: number;
  uniqueUsers: number;
}

interface DailyUsage {
  date: string;
  tokens: number;
}

export default function AdminAI() {
  const [stats, setStats] = useState<AIStats | null>(null);
  const [abusers, setAbusers] = useState<AbuserData[]>([]);
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Chat viewer
  const [searchUserId, setSearchUserId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-ai-usage", {
        body: { mode: "overview" },
      });
      if (error) throw error;
      setStats(data?.stats || null);
      setDailyUsage(data?.dailyUsage || []);
      setAbusers(data?.abusers || []);
    } catch (error) {
      console.error("Error loading AI overview:", error);
      toast.error("Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  };

  const banUser = async (userId: string) => {
    if (!confirm("Заблокировать этого пользователя?")) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from("admin_logs").insert({
        admin_id: user?.id,
        action: "ban_user",
        target_type: "user",
        target_id: userId,
        details: { reason: "AI abuse" }
      });

      const { error } = await supabase
        .from("profiles")
        .update({ blocked_at: new Date().toISOString() })
        .eq("user_id", userId);

      if (error) throw error;

      toast.success("Пользователь заблокирован");
    } catch (error) {
      console.error("Error banning user:", error);
      toast.error("Ошибка блокировки");
    }
  };

  const loadChatHistory = async (userId: string) => {
    setSelectedUserId(userId);
    setLoadingChat(true);
    setChatHistory([]);

    try {
      const { data, error } = await supabase.functions.invoke("admin-ai-usage", {
        body: { mode: "chat", userId },
      });
      if (error) throw error;
      setChatHistory((data?.chatHistory || []) as ChatMessage[]);
    } catch (error) {
      console.error("Error loading chat:", error);
      toast.error("Ошибка загрузки чата");
    } finally {
      setLoadingChat(false);
    }
  };

  const searchUserChat = () => {
    if (!searchUserId.trim()) {
      toast.error("Введите ID пользователя");
      return;
    }
    loadChatHistory(searchUserId.trim());
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-sm text-muted-foreground">
            Токены: <span className="text-primary font-medium">{payload[0]?.value?.toLocaleString()}</span>
          </p>
        </div>
      );
    }
    return null;
  };



  return (
    <AdminLayout title="AI & Usage" description="Мониторинг использования AI и управление abuse">
      {/* Refresh */}
      <div className="flex justify-end mb-6">
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Zap className="h-8 w-8 text-yellow-400" />
              <div>
                <p className="text-sm text-muted-foreground">Всего токенов</p>
                <p className="text-2xl font-bold">{(stats?.totalTokens || 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>


        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <TrendingUp className="h-8 w-8 text-blue-400" />
              <div>
                <p className="text-sm text-muted-foreground">Токенов сегодня</p>
                <p className="text-2xl font-bold">{(stats?.tokensToday || 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Users className="h-8 w-8 text-purple-400" />
              <div>
                <p className="text-sm text-muted-foreground">Уникальных юзеров</p>
                <p className="text-2xl font-bold">{stats?.uniqueUsers || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 mb-8">
        {/* Daily tokens chart */}
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Потребление токенов по дням</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {dailyUsage.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyUsage}>
                    <defs>
                      <linearGradient id="tokenGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="tokens"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#tokenGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Нет данных
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top abusers */}
      <Card className="bg-card/50 backdrop-blur border-border/50 mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Топ-20 по потреблению токенов</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead>#</TableHead>
                <TableHead>Пользователь</TableHead>
                <TableHead>Токены</TableHead>
                <TableHead>Сообщений</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {abusers.map((abuser, index) => (
                <TableRow key={abuser.user_id} className="border-border/50">
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{abuser.display_name || abuser.username || "Без имени"}</p>
                      <div className="flex items-center gap-1">
                        <p className="text-xs text-muted-foreground truncate max-w-[150px]" title={abuser.user_id}>{abuser.user_id}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(abuser.user_id);
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
                    <Badge variant={abuser.total_tokens > 100000 ? "destructive" : "secondary"}>
                      {abuser.total_tokens.toLocaleString()}
                    </Badge>
                  </TableCell>
                  <TableCell>{abuser.message_count}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => loadChatHistory(abuser.user_id)}
                        title="Просмотр чата"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => banUser(abuser.user_id)}
                        title="Заблокировать"
                      >
                        <Ban className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {abusers.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              Данных нет
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search user chat */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Поиск истории чата по User ID</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Введите User ID..."
              value={searchUserId}
              onChange={(e) => setSearchUserId(e.target.value)}
              className="flex-1"
            />
            <Button onClick={searchUserChat}>
              <Search className="h-4 w-4 mr-2" />
              Найти
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Chat history modal */}
      <Dialog open={!!selectedUserId} onOpenChange={() => setSelectedUserId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              История AI-чата: {selectedUserId?.slice(0, 8)}...
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="h-[500px] pr-4">
            {loadingChat ? (
              <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
            ) : chatHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Сообщений не найдено</div>
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
    </AdminLayout>
  );
}
