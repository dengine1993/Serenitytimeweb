import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriptionId: string | null;
  userLabel?: string;
  onSuccess: () => void;
}

const PRESETS = [7, 30, 90, 365];

export function ExtendSubscriptionDialog({ open, onOpenChange, subscriptionId, userLabel, onSuccess }: Props) {
  const [days, setDays] = useState<number>(30);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!subscriptionId || days <= 0) return;
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("admin-payments", {
        body: { mode: "extend", subscriptionId, days },
      });
      if (error) throw error;
      toast.success(`Подписка продлена на ${days} дн.`);
      onSuccess();
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error("Ошибка продления");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Продлить подписку</DialogTitle>
          <DialogDescription>
            {userLabel ? `Пользователь: ${userLabel}` : "Выберите количество дней"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((d) => (
              <Button
                key={d}
                type="button"
                variant={days === d ? "default" : "outline"}
                size="sm"
                onClick={() => setDays(d)}
              >
                {d} дн
              </Button>
            ))}
          </div>
          <div>
            <Label htmlFor="custom-days">Произвольно (дней)</Label>
            <Input
              id="custom-days"
              type="number"
              min={1}
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value) || 0)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Отмена
          </Button>
          <Button onClick={submit} disabled={loading || days <= 0}>
            {loading ? "Продление…" : "Продлить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
