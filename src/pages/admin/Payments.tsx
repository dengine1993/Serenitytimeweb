import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Download, Plus, XCircle, Search, Undo2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ExtendSubscriptionDialog } from "@/components/admin/payments/ExtendSubscriptionDialog";
import { CancelSubscriptionDialog } from "@/components/admin/payments/CancelSubscriptionDialog";
import { RefundPaymentDialog } from "@/components/admin/payments/RefundPaymentDialog";
import { GrantPremiumDialog } from "@/components/admin/payments/GrantPremiumDialog";
import { SubscriptionRowMobile, type SubscriptionRow } from "@/components/admin/payments/SubscriptionRowMobile";
import { PaymentRowMobile, type PaymentRow } from "@/components/admin/payments/PaymentRowMobile";

interface Stats {
  activeSubs: number;
  totalPayments: number;
  grossRevenue: number;
  netRevenue: number;
  refundedAmount: number;
  mrr: number;
  avgCheck: number;
}

const PAGE_SIZES = [25, 50, 100];

function escapeCSV(v: unknown): string {
  if (v == null) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function statusBadge(status: string | null) {
  switch (status) {
    case "active":
      return <Badge className="bg-green-500/20 text-green-400 hover:bg-green-500/30">Активна</Badge>;
    case "canceled":
      return <Badge variant="secondary">Отменена</Badge>;
    case "expired":
      return <Badge variant="destructive">Истекла</Badge>;
    case "succeeded":
      return <Badge className="bg-green-500/20 text-green-400 hover:bg-green-500/30">Успешно</Badge>;
    case "pending":
      return <Badge className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30">Ожидание</Badge>;
    case "failed":
      return <Badge variant="destructive">Ошибка</Badge>;
    case "refunded":
      return <Badge className="bg-orange-500/20 text-orange-400 hover:bg-orange-500/30">Возврат</Badge>;
    default:
      return <Badge variant="secondary">{status ?? "—"}</Badge>;
  }
}

function formatRub(n: number) {
  return `${Math.round(n).toLocaleString("ru-RU")} ₽`;
}

export default function AdminPayments() {
  const [tab, setTab] = useState<"subscriptions" | "payments">("subscriptions");
  const [rows, setRows] = useState<SubscriptionRow[] | PaymentRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // filters
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState("all");
  const [provider, setProvider] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // dialogs
  const [extendSub, setExtendSub] = useState<SubscriptionRow | null>(null);
  const [cancelSub, setCancelSub] = useState<SubscriptionRow | null>(null);
  const [refundPay, setRefundPay] = useState<PaymentRow | null>(null);
  const [grantOpen, setGrantOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // reset page on filter change
  useEffect(() => { setPage(1); }, [tab, debounced, status, provider, pageSize]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-payments", {
        body: {
          mode: "list",
          tab,
          search: debounced || undefined,
          status: status !== "all" ? status : undefined,
          provider: provider !== "all" ? provider : undefined,
          page,
          pageSize,
        },
      });
      if (error) throw error;
      setRows(data?.rows ?? []);
      setTotal(data?.total ?? 0);
      setStats(data?.stats ?? null);
    } catch (e) {
      console.error("Load payments error:", e);
      toast.error("Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  }, [tab, debounced, status, provider, page, pageSize]);

  useEffect(() => { loadData(); }, [loadData]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const exportCSV = () => {
    if (rows.length === 0) {
      toast.error("Нет данных для экспорта");
      return;
    }
    const sample = rows[0] as unknown as Record<string, unknown>;
    const keys = Object.keys(sample).filter((k) => k !== "profile");
    const headers = [...keys, "user_name"];
    const lines = [headers.join(",")];
    for (const r of rows as unknown as Array<Record<string, unknown> & { profile?: { display_name?: string | null } | null }>) {
      const row = keys.map((k) => escapeCSV(r[k]));
      row.push(escapeCSV(r.profile?.display_name ?? ""));
      lines.push(row.join(","));
    }
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${tab}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast.success("CSV экспортирован");
  };

  const subStatusOptions = useMemo(() => ["all", "active", "canceled", "expired", "pending"], []);
  const paymentStatusOptions = useMemo(() => ["all", "succeeded", "pending", "failed", "refunded"], []);
  const providerOptions = useMemo(() => ["all", "yookassa", "admin_manual", "stripe"], []);

  const userCell = (row: { user_id: string; profile?: { display_name: string | null; username: string | null; avatar_url: string | null } | null }) => {
    const name = row.profile?.display_name ?? row.profile?.username ?? `${row.user_id.slice(0, 8)}…`;
    return (
      <div className="flex items-center gap-2 min-w-0">
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarImage src={row.profile?.avatar_url ?? undefined} />
          <AvatarFallback className="text-[10px]">{name.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm truncate">{name}</p>
          <p className="text-[10px] text-muted-foreground font-mono truncate">{row.user_id.slice(0, 8)}…</p>
        </div>
      </div>
    );
  };

  return (
    <AdminLayout title="Платежи" description="Подписки, платежи и ручные операции">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Активные</p>
            <p className="text-2xl font-bold mt-1">{stats?.activeSubs ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">MRR</p>
            <p className="text-2xl font-bold mt-1">{formatRub(stats?.mrr ?? 0)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Выручка (нетто)</p>
            <p className="text-2xl font-bold mt-1">{formatRub(stats?.netRevenue ?? 0)}</p>
            {stats && stats.refundedAmount > 0 && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                возвраты: −{formatRub(stats.refundedAmount)}
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Платежей</p>
            <p className="text-2xl font-bold mt-1">{stats?.totalPayments ?? 0}</p>
            {stats && stats.avgCheck > 0 && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                ср. чек: {formatRub(stats.avgCheck)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "subscriptions" | "payments")}>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <TabsList className="bg-card/50 self-start">
            <TabsTrigger value="subscriptions">Подписки</TabsTrigger>
            <TabsTrigger value="payments">Платежи</TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setGrantOpen(true)}>
              <Sparkles className="h-4 w-4 mr-1" /> Выдать премиум
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Обновить
            </Button>
          </div>
        </div>

        {/* Toolbar: search + filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
          <div className="relative sm:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={tab === "payments" ? "Поиск по ID платежа / user…" : "Поиск по external_id / user…"}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Статус" /></SelectTrigger>
            <SelectContent>
              {(tab === "subscriptions" ? subStatusOptions : paymentStatusOptions).map((s) => (
                <SelectItem key={s} value={s}>{s === "all" ? "Все статусы" : s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger><SelectValue placeholder="Провайдер" /></SelectTrigger>
            <SelectContent>
              {providerOptions.map((p) => (
                <SelectItem key={p} value={p}>{p === "all" ? "Все провайдеры" : p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* SUBSCRIPTIONS */}
        <TabsContent value="subscriptions">
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {(rows as SubscriptionRow[]).map((sub) => (
              <SubscriptionRowMobile
                key={sub.id}
                sub={sub}
                statusBadge={statusBadge(sub.status)}
                onExtend={() => setExtendSub(sub)}
                onCancel={() => setCancelSub(sub)}
              />
            ))}
            {!loading && rows.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Подписок нет</p>
            )}
          </div>

          {/* Desktop table */}
          <Card className="hidden md:block bg-card/50 backdrop-blur border-border/50">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead>Пользователь</TableHead>
                    <TableHead>План</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Период</TableHead>
                    <TableHead>Auto-renew</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rows as SubscriptionRow[]).map((sub) => (
                    <TableRow key={sub.id} className="border-border/50">
                      <TableCell>{userCell(sub)}</TableCell>
                      <TableCell><Badge variant="secondary">{sub.plan}</Badge></TableCell>
                      <TableCell>{statusBadge(sub.status)}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {sub.current_period_start
                          ? new Date(sub.current_period_start).toLocaleDateString("ru-RU")
                          : "—"}
                        {" — "}
                        {sub.current_period_end
                          ? new Date(sub.current_period_end).toLocaleDateString("ru-RU")
                          : "∞"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={sub.auto_renew ? "default" : "secondary"}>
                          {sub.auto_renew ? "Вкл" : "Выкл"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{sub.payment_provider ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" title="Продлить" onClick={() => setExtendSub(sub)}>
                            <Plus className="h-4 w-4 text-green-400" />
                          </Button>
                          {sub.status === "active" && (
                            <Button variant="ghost" size="icon" title="Отменить" onClick={() => setCancelSub(sub)}>
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!loading && rows.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">Подписок нет</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PAYMENTS */}
        <TabsContent value="payments">
          <div className="md:hidden space-y-3">
            {(rows as PaymentRow[]).map((p) => (
              <PaymentRowMobile
                key={p.id}
                payment={p}
                statusBadge={statusBadge(p.status)}
                onRefund={() => setRefundPay(p)}
              />
            ))}
            {!loading && rows.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Платежей нет</p>
            )}
          </div>

          <Card className="hidden md:block bg-card/50 backdrop-blur border-border/50">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead>Дата</TableHead>
                    <TableHead>Пользователь</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Продукт</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>External ID</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rows as PaymentRow[]).map((p) => {
                    const canRefund = p.status === "succeeded" && !p.refunded_at;
                    return (
                      <TableRow key={p.id} className="border-border/50">
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(p.created_at).toLocaleDateString("ru-RU")}
                        </TableCell>
                        <TableCell>{userCell(p)}</TableCell>
                        <TableCell className="font-medium whitespace-nowrap">
                          {p.amount.toLocaleString()} {p.currency ?? "RUB"}
                        </TableCell>
                        <TableCell>{statusBadge(p.status)}</TableCell>
                        <TableCell><Badge variant="secondary">{p.product_type ?? "—"}</Badge></TableCell>
                        <TableCell className="text-xs">{p.provider ?? "—"}</TableCell>
                        <TableCell className="font-mono text-[11px] max-w-[140px] truncate">
                          {p.yookassa_payment_id ?? p.external_id ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {canRefund && (
                            <Button variant="ghost" size="icon" title="Возврат" onClick={() => setRefundPay(p)}>
                              <Undo2 className="h-4 w-4 text-orange-400" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {!loading && rows.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">Платежей нет</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>На странице:</span>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="h-8 w-[80px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((s) => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <span>Всего: {total}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
              Назад
            </Button>
            <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>
              Вперёд
            </Button>
          </div>
        </div>
      </Tabs>

      {/* Dialogs */}
      <ExtendSubscriptionDialog
        open={!!extendSub}
        onOpenChange={(o) => !o && setExtendSub(null)}
        subscriptionId={extendSub?.id ?? null}
        userLabel={extendSub?.profile?.display_name ?? undefined}
        onSuccess={loadData}
      />
      <CancelSubscriptionDialog
        open={!!cancelSub}
        onOpenChange={(o) => !o && setCancelSub(null)}
        subscriptionId={cancelSub?.id ?? null}
        userLabel={cancelSub?.profile?.display_name ?? undefined}
        onSuccess={loadData}
      />
      <RefundPaymentDialog
        open={!!refundPay}
        onOpenChange={(o) => !o && setRefundPay(null)}
        paymentId={refundPay?.id ?? null}
        amountLabel={refundPay ? `${refundPay.amount.toLocaleString()} ${refundPay.currency ?? "RUB"}` : undefined}
        onSuccess={loadData}
      />
      <GrantPremiumDialog
        open={grantOpen}
        onOpenChange={setGrantOpen}
        onSuccess={loadData}
      />
    </AdminLayout>
  );
}
