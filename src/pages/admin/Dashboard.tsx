import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, Crown, MessageSquare, FileText, AlertTriangle, RefreshCw, CreditCard, Shield, Bot } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface DashboardStats {
  totalUsers: number;
  activeUsers7d: number;
  premiumUsers: number;
  postsToday: number;
  abuseUsers: number;
}

interface GrowthData {
  date: string;
  label: string;
  users: number;
  new: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [growthData, setGrowthData] = useState<GrowthData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();

    const profilesChannel = supabase
      .channel('admin-dashboard-profiles')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, (payload) => {
        const newUser = payload.new as any;
        toast.success(`Новый пользователь: ${newUser.display_name || newUser.username || 'Аноним'}`);
        loadDashboardData();
      })
      .subscribe();

    const postsChannel = supabase
      .channel('admin-dashboard-posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => {
        loadDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(postsChannel);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('analytics-dashboard');

      if (error) throw error;
      if (!data || data.error) throw new Error(data?.error || 'Empty response');

      setStats({
        totalUsers: data.stats.totalUsers || 0,
        activeUsers7d: data.stats.activeUsers7d || 0,
        premiumUsers: data.stats.premiumUsers || 0,
        postsToday: data.stats.postsToday || 0,
        abuseUsers: data.stats.abuseUsers || 0,
      });

      setGrowthData(
        (data.growth || []).map((g: any) => ({
          date: g.date,
          label: g.label,
          users: g.users,
          new: g.new,
        }))
      );
    } catch (error) {
      console.error("Error loading dashboard:", error);
      toast.error("Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  };

  const metricCards = [
    { title: "Всего пользователей", value: stats?.totalUsers || 0, icon: Users, color: "text-blue-400" },
    { title: "Активных за 7 дней", value: stats?.activeUsers7d || 0, icon: TrendingUp, color: "text-green-400" },
    { title: "Premium подписок", value: stats?.premiumUsers || 0, icon: Crown, color: "text-yellow-400" },
    { title: "Постов сегодня", value: stats?.postsToday || 0, icon: FileText, color: "text-cyan-400" },
    { title: "Подозрение на абьюз (>100k токенов)", value: stats?.abuseUsers || 0, icon: AlertTriangle, color: "text-red-400" },
  ];

  const quickActions = [
    { label: "Пользователи", icon: Users, onClick: () => navigate("/admin/users"), color: "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30" },
    { label: "Модерация", icon: Shield, onClick: () => navigate("/admin/moderation"), color: "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30" },
    { label: "Платежи", icon: CreditCard, onClick: () => navigate("/admin/payments"), color: "bg-green-500/20 text-green-400 hover:bg-green-500/30" },
    { label: "AI Аналитика", icon: Bot, onClick: () => navigate("/admin/ai"), color: "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30" },
  ];

  return (
    <AdminLayout title="Дашборд" description="Обзор ключевых метрик платформы">
      {/* Quick actions + Refresh */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action, i) => (
            <Button
              key={i}
              variant="ghost"
              size="sm"
              onClick={action.onClick}
              className={`gap-2 ${action.color}`}
            >
              <action.icon className="h-4 w-4" />
              {action.label}
            </Button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadDashboardData}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </Button>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {metricCards.map((card, index) => (
          <Card key={index} className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className="text-3xl font-bold mt-2">{card.value.toLocaleString()}</p>
                </div>
                <card.icon className={`h-10 w-10 ${card.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User growth */}
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Рост пользователей</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="users" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* New users per day */}
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Новые регистрации</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="new" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
