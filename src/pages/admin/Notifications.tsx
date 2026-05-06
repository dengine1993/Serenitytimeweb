import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Bell, Send, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type Audience = "all" | "premium" | "free" | "user_ids";

interface BroadcastRow {
  id: string;
  title: string;
  body: string;
  url: string | null;
  audience: string;
  urgent: boolean;
  sent_count: number;
  failed_count: number;
  created_at: string;
}

export default function AdminNotifications() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [audience, setAudience] = useState<Audience>("all");
  const [emails, setEmails] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<BroadcastRow[]>([]);

  async function loadHistory() {
    const { data } = await supabase
      .from("admin_broadcasts")
      .select("id, title, body, url, audience, urgent, sent_count, failed_count, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    setHistory((data ?? []) as BroadcastRow[]);
  }

  useEffect(() => { loadHistory(); }, []);

  async function send(testSelf: boolean) {
    if (!title.trim() || !body.trim()) {
      toast.error("Заполни заголовок и текст");
      return;
    }
    setLoading(true);
    try {
      const payload: any = {
        title: title.trim(),
        body: body.trim(),
        url: url.trim() || undefined,
        audience,
        urgent,
        test_self: testSelf,
      };
      if (audience === "user_ids" && !testSelf) {
        const list = emails.split(/[\s,;\n]+/).map((e) => e.trim()).filter(Boolean);
        if (list.length === 0) {
          toast.error("Укажи список email");
          setLoading(false);
          return;
        }
        payload.emails = list;
      }
      const { data, error } = await supabase.functions.invoke("admin-broadcast-push", { body: payload });
      if (error) throw error;
      toast.success(`Отправлено: ${data.sent} • Ошибок: ${data.failed} • Получателей: ${data.recipients}`);
      if (!testSelf) {
        setTitle(""); setBody(""); setUrl(""); setEmails("");
      }
      loadHistory();
    } catch (e: any) {
      toast.error(e?.message ?? "Ошибка отправки");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminLayout title="Push-рассылки" description="Ручная отправка push-уведомлений пользователям">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Composer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Новый пуш
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Заголовок ({title.length}/80)</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 80))} placeholder="Например: Новый Восход" />
            </div>
            <div className="space-y-2">
              <Label>Текст ({body.length}/240)</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value.slice(0, 240))} rows={3} placeholder="Что важного хочешь сказать" />
            </div>
            <div className="space-y-2">
              <Label>Ссылка (опц.)</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/app или /post/123" />
            </div>

            <div className="space-y-2">
              <Label>Аудитория</Label>
              <RadioGroup value={audience} onValueChange={(v) => setAudience(v as Audience)} className="grid grid-cols-2 gap-2">
                {[
                  { v: "all", l: "Все" },
                  { v: "premium", l: "Premium" },
                  { v: "free", l: "Free" },
                  { v: "user_ids", l: "По email" },
                ].map((o) => (
                  <label key={o.v} className="flex items-center gap-2 rounded-md border border-border/50 px-3 py-2 cursor-pointer">
                    <RadioGroupItem value={o.v} id={`a-${o.v}`} />
                    <span className="text-sm">{o.l}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            {audience === "user_ids" && (
              <div className="space-y-2">
                <Label>Email-адреса (через запятую или с новой строки)</Label>
                <Textarea value={emails} onChange={(e) => setEmails(e.target.value)} rows={3} placeholder="user1@example.com, user2@example.com" />
              </div>
            )}

            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox checked={urgent} onCheckedChange={(v) => setUrgent(!!v)} />
              <span className="text-sm">
                <span className="font-medium flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                  Срочный — игнорировать тихие часы
                </span>
                <span className="text-xs text-muted-foreground">Используй только для критически важных сообщений</span>
              </span>
            </label>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => send(true)} disabled={loading} className="flex-1">
                Тест себе
              </Button>
              <Button onClick={() => send(false)} disabled={loading} className="flex-1">
                <Send className="h-4 w-4 mr-2" />
                Разослать
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Превью</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur p-4 space-y-2 max-w-sm">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="h-6 w-6 rounded-md bg-primary/20 flex items-center justify-center">
                  <Bell className="h-3 w-3 text-primary" />
                </div>
                Восход • сейчас
              </div>
              <div className="font-semibold text-sm">{title || "Заголовок"}</div>
              <div className="text-sm text-muted-foreground line-clamp-3">{body || "Текст уведомления появится здесь"}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Пуш не доставится тем, кто отключил «Сообщения от администрации» в настройках или находится в тихих часах (если не выбрано «Срочный»).
            </p>
          </CardContent>
        </Card>
      </div>

      {/* History */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>История рассылок</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Пока пусто</p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="flex items-start justify-between gap-4 p-3 rounded-lg border border-border/50 bg-card/40">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{h.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{h.body}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {format(new Date(h.created_at), "dd.MM.yyyy HH:mm")} • {h.audience}{h.urgent ? " • срочный" : ""}
                    </div>
                  </div>
                  <div className="text-right text-xs whitespace-nowrap">
                    <div className="text-emerald-500">✓ {h.sent_count}</div>
                    {h.failed_count > 0 && <div className="text-rose-500">✗ {h.failed_count}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
