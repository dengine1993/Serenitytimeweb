import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertTriangle, Plus, RefreshCw, ExternalLink, ShieldAlert,
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { toast } from "sonner";

type Severity = "low" | "medium" | "high" | "critical";
type Status = "new" | "investigating" | "reported_to_rkn" | "resolved";
type IncidentType = "data_leak" | "unauthorized_access" | "system_compromise" | "auto_detected" | "other";

interface Incident {
  id: string;
  incident_type: IncidentType;
  severity: Severity;
  title: string;
  description: string | null;
  discovered_at: string;
  affected_users_count: number;
  status: Status;
  rkn_notified_at: string | null;
  rkn_reference: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

const SEVERITY_COLORS: Record<Severity, string> = {
  low: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  medium: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  high: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  critical: "bg-red-500/10 text-red-600 border-red-500/30",
};

const STATUS_LABEL: Record<Status, string> = {
  new: "Новый",
  investigating: "Расследуется",
  reported_to_rkn: "Отправлено в РКН",
  resolved: "Закрыт",
};

const TYPE_LABEL: Record<IncidentType, string> = {
  data_leak: "Утечка данных",
  unauthorized_access: "Несанкц. доступ",
  system_compromise: "Компрометация системы",
  auto_detected: "Автодетект",
  other: "Другое",
};

export default function AdminIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Incident | null>(null);

  // Create form
  const [form, setForm] = useState({
    incident_type: "data_leak" as IncidentType,
    severity: "medium" as Severity,
    title: "",
    description: "",
    affected_users_count: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const q = supabase.from("security_incidents").select("*").order("created_at", { ascending: false });
    const { data, error } = statusFilter === "all" ? await q : await q.eq("status", statusFilter);
    if (error) toast.error("Ошибка загрузки: " + error.message);
    else setIncidents((data ?? []) as Incident[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter]);

  const handleCreate = async () => {
    if (form.title.trim().length < 3) {
      toast.error("Заголовок слишком короткий");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("report-security-incident", {
        body: {
          incident_type: form.incident_type,
          severity: form.severity,
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          affected_users_count: form.affected_users_count,
        },
      });
      if (error) throw error;
      if (data?.email_sent) toast.success("Инцидент создан. Email отправлен админу.");
      else toast.warning("Инцидент создан, но email не отправлен: " + (data?.email_error ?? "?"));
      setCreateOpen(false);
      setForm({ incident_type: "data_leak", severity: "medium", title: "", description: "", affected_users_count: 0 });
      load();
    } catch (e) {
      toast.error("Ошибка: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSubmitting(false);
    }
  };

  const updateIncident = async (id: string, patch: Partial<Incident>) => {
    const { error } = await supabase.from("security_incidents").update(patch).eq("id", id);
    if (error) {
      toast.error("Ошибка: " + error.message);
      return;
    }
    toast.success("Сохранено");
    load();
    if (selected?.id === id) setSelected({ ...selected, ...patch });
  };

  const newCount = incidents.filter((i) => i.status === "new").length;

  return (
    <AdminLayout title="Инциденты ПДн" description="152-ФЗ: учёт инцидентов и уведомление РКН в течение 24 часов">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as Status | "all")}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="new">Новые ({newCount})</SelectItem>
              <SelectItem value="investigating">Расследуются</SelectItem>
              <SelectItem value="reported_to_rkn">В РКН</SelectItem>
              <SelectItem value="resolved">Закрыты</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Создать инцидент</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Новый инцидент ПДн</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Тип</Label>
                  <Select value={form.incident_type} onValueChange={(v) => setForm({ ...form, incident_type: v as IncidentType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TYPE_LABEL) as IncidentType[]).map((k) => (
                        <SelectItem key={k} value={k}>{TYPE_LABEL[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Серьёзность</Label>
                  <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v as Severity })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Низкая</SelectItem>
                      <SelectItem value="medium">Средняя</SelectItem>
                      <SelectItem value="high">Высокая</SelectItem>
                      <SelectItem value="critical">Критическая</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Заголовок *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Краткое описание инцидента" maxLength={200} />
              </div>
              <div>
                <Label>Подробное описание</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={5} placeholder="Что произошло, как обнаружено, какие меры приняты" maxLength={5000} />
              </div>
              <div>
                <Label>Затронуто пользователей (примерно)</Label>
                <Input type="number" min={0} value={form.affected_users_count} onChange={(e) => setForm({ ...form, affected_users_count: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setCreateOpen(false)}>Отмена</Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting ? "Создаём…" : "Создать и уведомить"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {newCount > 0 && (
        <Card className="mb-6 border-red-500/30 bg-red-500/5">
          <CardContent className="pt-6 flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-red-500" />
            <div className="flex-1">
              <p className="font-medium">{newCount} новых инцидентов требуют внимания</p>
              <p className="text-sm text-muted-foreground">152-ФЗ: РКН должен быть уведомлён в течение 24 часов</p>
            </div>
            <a href="https://pd.rkn.gov.ru/incidents/" target="_blank" rel="noreferrer">
              <Button size="sm" variant="outline" className="gap-2">
                Форма РКН <ExternalLink className="h-3 w-3" />
              </Button>
            </a>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Все инциденты ({incidents.length})</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-2">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Загрузка…</div>
              ) : incidents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Нет инцидентов
                </div>
              ) : incidents.map((inc) => (
                <button
                  key={inc.id}
                  onClick={() => setSelected(inc)}
                  className="w-full text-left flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge className={SEVERITY_COLORS[inc.severity]} variant="outline">{inc.severity}</Badge>
                      <Badge variant="secondary">{TYPE_LABEL[inc.incident_type]}</Badge>
                      <Badge variant={inc.status === "new" ? "destructive" : "outline"}>{STATUS_LABEL[inc.status]}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(inc.created_at), "dd.MM.yyyy HH:mm", { locale: ru })}
                      </span>
                    </div>
                    <p className="font-medium text-sm">{inc.title}</p>
                    {inc.affected_users_count > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">Затронуто пользователей: {inc.affected_users_count}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  <Badge className={SEVERITY_COLORS[selected.severity]} variant="outline">{selected.severity}</Badge>
                  {selected.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><span className="text-muted-foreground">Тип:</span> {TYPE_LABEL[selected.incident_type]}</div>
                  <div><span className="text-muted-foreground">Затронуто:</span> {selected.affected_users_count}</div>
                  <div><span className="text-muted-foreground">Обнаружено:</span> {format(new Date(selected.discovered_at), "dd.MM.yyyy HH:mm", { locale: ru })}</div>
                  <div><span className="text-muted-foreground">Создано:</span> {format(new Date(selected.created_at), "dd.MM.yyyy HH:mm", { locale: ru })}</div>
                </div>
                {selected.description && (
                  <div>
                    <Label>Описание</Label>
                    <p className="whitespace-pre-wrap text-muted-foreground">{selected.description}</p>
                  </div>
                )}
                <div>
                  <Label>Статус</Label>
                  <Select value={selected.status} onValueChange={(v) => updateIncident(selected.id, { status: v as Status })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_LABEL) as Status[]).map((k) => (
                        <SelectItem key={k} value={k}>{STATUS_LABEL[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>№ обращения в РКН</Label>
                  <Input
                    value={selected.rkn_reference ?? ""}
                    onChange={(e) => setSelected({ ...selected, rkn_reference: e.target.value })}
                    onBlur={() => updateIncident(selected.id, { rkn_reference: selected.rkn_reference, rkn_notified_at: selected.rkn_reference ? new Date().toISOString() : null })}
                    placeholder="После подачи в РКН"
                  />
                </div>
                <div>
                  <Label>Заметки по расследованию</Label>
                  <Textarea
                    value={selected.resolution_notes ?? ""}
                    onChange={(e) => setSelected({ ...selected, resolution_notes: e.target.value })}
                    onBlur={() => updateIncident(selected.id, { resolution_notes: selected.resolution_notes })}
                    rows={4}
                  />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
