import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Brain, Database, Percent, Sparkles, Loader2 } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';

type Range = '7d' | '30d' | 'all';

interface MemoryDashboardData {
  range: Range;
  kpi: {
    totalChunks: number;
    activeMemoryUsers: number;
    hitRate: number;
    totalTokens: number;
  };
  topUsers: Array<{
    user_id: string;
    display_name: string;
    plan: string;
    is_premium: boolean;
    memory_count: number;
  }>;
  cacheStats: {
    totalEmbedItems: number;
    cacheHits: number;
    hitRate: number;
    embedPromptTokens: number;
  };
  tokenUsage: {
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalTokens: number;
    freeTokens: number;
    premiumTokens: number;
    embedPromptTokens: number;
    byModel: Array<{
      model: string;
      prompt: number;
      completion: number;
      total: number;
      calls: number;
    }>;
  };
  memoryGrowth: Array<{ date: string; count: number }>;
}

function fmt(n: number): string {
  return new Intl.NumberFormat('ru-RU').format(n);
}

export default function AdminAiMemory() {
  const [range, setRange] = useState<Range>('30d');
  const [data, setData] = useState<MemoryDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // fetch with range as query param (functions.invoke не пробрасывает query)
  // Re-fetch with range query (functions.invoke doesn't pass query, use fetch URL)
  useEffect(() => {
    let cancelled = false;
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai-memory?range=${range}`;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token;
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '',
          },
        });
        if (!res.ok) throw new Error(await res.text());
        const json = (await res.json()) as MemoryDashboardData;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [range]);

  const hitRatePct = useMemo(
    () => (data ? (data.kpi.hitRate * 100).toFixed(1) : '—'),
    [data],
  );

  return (
    <AdminLayout title="Память ИИ" description="Метрики долгосрочной памяти Jiva: чанки, кеш эмбеддингов, расход токенов.">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div />
          <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1">
            {(['7d', '30d', 'all'] as Range[]).map((r) => (
              <Button
                key={r}
                size="sm"
                variant={range === r ? 'default' : 'ghost'}
                onClick={() => setRange(r)}
                className="text-xs"
              >
                {r === '7d' ? '7 дней' : r === '30d' ? '30 дней' : 'Всё время'}
              </Button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Загрузка…
          </div>
        )}
        {error && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        )}

        {data && (
          <>
            {/* KPI */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <KpiCard
                icon={<Brain className="h-4 w-4" />}
                label="Всего фактов"
                value={fmt(data.kpi.totalChunks)}
              />
              <KpiCard
                icon={<Sparkles className="h-4 w-4" />}
                label="Активных юзеров"
                value={fmt(data.kpi.activeMemoryUsers)}
                hint="с записями памяти"
              />
              <KpiCard
                icon={<Percent className="h-4 w-4" />}
                label="Hit-rate кеша"
                value={`${hitRatePct}%`}
                hint={`${fmt(data.cacheStats.cacheHits)} / ${fmt(data.cacheStats.totalEmbedItems)}`}
              />
              <KpiCard
                icon={<Database className="h-4 w-4" />}
                label="Токены чата"
                value={fmt(data.kpi.totalTokens)}
                hint={`free: ${fmt(data.tokenUsage.freeTokens)} • prem: ${fmt(data.tokenUsage.premiumTokens)}`}
              />
            </div>

            {/* Memory growth */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Рост памяти по дням</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                {data.memoryGrowth.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Нет данных за период.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.memoryGrowth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          background: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              {/* Top users */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Топ-20 по объёму памяти</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.topUsers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Пусто.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Пользователь</TableHead>
                          <TableHead>План</TableHead>
                          <TableHead className="text-right">Фактов</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.topUsers.map((u) => (
                          <TableRow key={u.user_id}>
                            <TableCell className="font-medium">
                              {u.display_name}
                              <div className="text-[10px] text-muted-foreground">
                                {u.user_id.slice(0, 8)}…
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={u.is_premium ? 'default' : 'secondary'}>
                                {u.is_premium ? 'Premium' : 'Free'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {fmt(u.memory_count)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* By model */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Расход по моделям</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.tokenUsage.byModel.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Нет вызовов.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Модель</TableHead>
                          <TableHead className="text-right">Вызовов</TableHead>
                          <TableHead className="text-right">Токенов</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.tokenUsage.byModel.map((m) => (
                          <TableRow key={m.model}>
                            <TableCell className="font-mono text-xs">{m.model}</TableCell>
                            <TableCell className="text-right tabular-nums">{fmt(m.calls)}</TableCell>
                            <TableCell className="text-right tabular-nums">{fmt(m.total)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  <div className="mt-3 text-xs text-muted-foreground">
                    Embed-токены (Polza): {fmt(data.cacheStats.embedPromptTokens)}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
        {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
      </CardContent>
    </Card>
  );
}
