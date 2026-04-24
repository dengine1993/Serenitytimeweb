import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentId: string | null;
  amountLabel?: string;
  onSuccess: () => void;
}

export function RefundPaymentDialog({ open, onOpenChange, paymentId, amountLabel, onSuccess }: Props) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!paymentId) return;
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("admin-payments", {
        body: { mode: "refund", paymentId, reason },
      });
      if (error) throw error;
      toast.success("Платёж помечен как возвращённый");
      onSuccess();
      onOpenChange(false);
      setReason("");
    } catch (e) {
      console.error(e);
      toast.error("Ошибка возврата");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Оформить возврат?</AlertDialogTitle>
          <AlertDialogDescription>
            {amountLabel ? `Сумма: ${amountLabel}. ` : ""}
            Платёж будет помечен как возвращённый. Реальный возврат через ЮKassa нужно сделать отдельно.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="refund-reason">Причина</Label>
          <Textarea
            id="refund-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Запрос пользователя, ошибка списания…"
            rows={3}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Отмена</AlertDialogCancel>
          <AlertDialogAction onClick={submit} disabled={loading}>
            {loading ? "…" : "Подтвердить возврат"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
