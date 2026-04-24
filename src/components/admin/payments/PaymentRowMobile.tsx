import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Undo2 } from "lucide-react";
import { ReactNode } from "react";

export interface PaymentRow {
  id: string;
  user_id: string;
  amount: number;
  currency: string | null;
  status: string | null;
  product_type: string | null;
  provider: string | null;
  external_id: string | null;
  yookassa_payment_id: string | null;
  refunded_at: string | null;
  created_at: string;
  profile?: { display_name: string | null; username: string | null; avatar_url: string | null } | null;
}

interface Props {
  payment: PaymentRow;
  statusBadge: ReactNode;
  onRefund: () => void;
}

export function PaymentRowMobile({ payment, statusBadge, onRefund }: Props) {
  const name = payment.profile?.display_name ?? payment.profile?.username ?? `${payment.user_id.slice(0, 8)}…`;
  const canRefund = payment.status === "succeeded" && !payment.refunded_at;

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={payment.profile?.avatar_url ?? undefined} />
            <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{name}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(payment.created_at).toLocaleString("ru-RU")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-base font-bold">
              {payment.amount.toLocaleString()} {payment.currency ?? "RUB"}
            </p>
            <div className="mt-1">{statusBadge}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">Продукт</p>
            <p className="font-medium">{payment.product_type ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Provider</p>
            <p className="font-medium truncate">{payment.provider ?? "—"}</p>
          </div>
          <div className="col-span-2">
            <p className="text-muted-foreground">External ID</p>
            <p className="font-mono text-[11px] truncate">
              {payment.yookassa_payment_id ?? payment.external_id ?? "—"}
            </p>
          </div>
        </div>

        {canRefund && (
          <Button variant="outline" size="sm" className="w-full" onClick={onRefund}>
            <Undo2 className="h-4 w-4 mr-1" /> Оформить возврат
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
