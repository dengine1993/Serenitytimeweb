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
  subscriptionId: string | null;
  userLabel?: string;
  onSuccess: () => void;
}

export function CancelSubscriptionDialog({ open, onOpenChange, subscriptionId, userLabel, onSuccess }: Props) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!subscriptionId) return;
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("admin-payments", {
        body: { mode: "cancel", subscriptionId, reason },
      });
      if (error) throw error;
      toast.success("Подписка отменена");
      onSuccess();
      onOpenChange(false);
      setReason("");
    } catch (e) {
      console.error(e);
      toast.error("Ошибка отмены");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Отменить подписку?</AlertDialogTitle>
          <AlertDialogDescription>
            {userLabel ? `Пользователь: ${userLabel}. ` : ""}
            Подписка будет помечена как отменённая и автопродление отключено.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="cancel-reason">Причина (необязательно)</Label>
          <Textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Запрос пользователя, дубликат…"
            rows={3}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Не отменять</AlertDialogCancel>
          <AlertDialogAction onClick={submit} disabled={loading}>
            {loading ? "…" : "Отменить подписку"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
