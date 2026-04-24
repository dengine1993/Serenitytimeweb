import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, XCircle } from "lucide-react";
import { ReactNode } from "react";

export interface SubscriptionRow {
  id: string;
  user_id: string;
  plan: string;
  status: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  payment_provider: string | null;
  auto_renew: boolean | null;
  billing_interval: string | null;
  created_at: string;
  profile?: { display_name: string | null; username: string | null; avatar_url: string | null } | null;
}

interface Props {
  sub: SubscriptionRow;
  statusBadge: ReactNode;
  onExtend: () => void;
  onCancel: () => void;
}

export function SubscriptionRowMobile({ sub, statusBadge, onExtend, onCancel }: Props) {
  const name = sub.profile?.display_name ?? sub.profile?.username ?? `${sub.user_id.slice(0, 8)}…`;
  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={sub.profile?.avatar_url ?? undefined} />
            <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{name}</p>
            <p className="text-xs text-muted-foreground font-mono truncate">{sub.user_id.slice(0, 12)}…</p>
          </div>
          {statusBadge}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">План</p>
            <p className="font-medium">{sub.plan}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Provider</p>
            <p className="font-medium truncate">{sub.payment_provider ?? "—"}</p>
          </div>
          <div className="col-span-2">
            <p className="text-muted-foreground">Период</p>
            <p className="font-medium">
              {sub.current_period_start
                ? new Date(sub.current_period_start).toLocaleDateString("ru-RU")
                : "—"}
              {" — "}
              {sub.current_period_end
                ? new Date(sub.current_period_end).toLocaleDateString("ru-RU")
                : "∞"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Auto-renew</p>
            <Badge variant={sub.auto_renew ? "default" : "secondary"} className="mt-0.5">
              {sub.auto_renew ? "Вкл" : "Выкл"}
            </Badge>
          </div>
          <div>
            <p className="text-muted-foreground">Интервал</p>
            <p className="font-medium">{sub.billing_interval ?? "—"}</p>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onExtend}>
            <Plus className="h-4 w-4 mr-1" /> Продлить
          </Button>
          {sub.status === "active" && (
            <Button variant="outline" size="sm" className="flex-1" onClick={onCancel}>
              <XCircle className="h-4 w-4 mr-1 text-destructive" /> Отменить
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
