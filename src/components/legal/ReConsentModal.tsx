import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useConsentVersionCheck } from "@/hooks/useConsentVersionCheck";
import { logReconsent } from "@/lib/consentLogger";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const TYPE_LABELS: Record<string, string> = {
  privacy: 'Политика обработки персональных данных',
  offer: 'Публичная оферта',
  disclaimer: 'Условия использования сервиса',
};

const TYPE_LINKS: Record<string, string> = {
  privacy: '/privacy',
  offer: '/offer',
  disclaimer: '/disclaimer',
};

/**
 * Блокирующая модалка повторного согласия при обновлении версии документов
 * (152-ФЗ — согласие должно быть на актуальную редакцию).
 *
 * Показывается поверх приложения, если в consent_log последняя принятая
 * версия одного из критичных согласий не совпадает с LEGAL_VERSIONS.
 *
 * Закрыть нельзя — только «Принять» или «Отозвать согласие и удалить аккаунт».
 */
export function ReConsentModal() {
  const { user, signOut } = useAuth();
  const { needsReConsent, staleTypes, loading, refresh } = useConsentVersionCheck();
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  if (!user || loading || !needsReConsent) return null;

  const handleAccept = async () => {
    if (!accepted) return;
    setSubmitting(true);
    try {
      await logReconsent(staleTypes);
      toast.success('Согласия обновлены');
      refresh();
    } catch (e) {
      console.error(e);
      toast.error('Не удалось сохранить согласие. Попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    setWithdrawing(true);
    try {
      const { error } = await supabase.functions.invoke('withdraw-consent', {
        body: { userId: user.id },
      });
      if (error) throw error;
      toast.success('Заявка на отзыв согласия принята. Ваши данные будут удалены.');
      await signOut();
    } catch (e) {
      console.error(e);
      toast.error('Не удалось отозвать согласие');
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => { /* блокирующая */ }}>
      <DialogContent
        className="max-w-lg [&>button.absolute]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Обновлены условия использования</DialogTitle>
          <DialogDescription>
            Мы обновили правовые документы. По 152-ФЗ нам необходимо ваше согласие на новую редакцию,
            чтобы продолжить обработку персональных данных.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-64 pr-2">
          <ul className="space-y-2 text-sm">
            {staleTypes.map((t) => (
              <li key={t} className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <Link to={TYPE_LINKS[t]} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
                  {TYPE_LABELS[t] || t}
                </Link>
              </li>
            ))}
          </ul>
        </ScrollArea>

        <div className="flex items-start gap-3 mt-2">
          <Checkbox
            id="reconsent-accept"
            checked={accepted}
            onCheckedChange={(v) => setAccepted(!!v)}
            className="mt-0.5 h-5 w-5"
          />
          <Label htmlFor="reconsent-accept" className="text-sm leading-relaxed cursor-pointer">
            Я ознакомился(ась) с обновлёнными документами и даю согласие на их условия в новой редакции.
            Подтверждение является письменным согласием в электронной форме (ч. 4 ст. 9 152-ФЗ, ст. 6 63-ФЗ).
          </Label>
        </div>

        <div className="flex flex-col gap-2 mt-4">
          <Button onClick={handleAccept} disabled={!accepted || submitting} className="w-full">
            {submitting ? 'Сохраняем…' : 'Принять и продолжить'}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="w-full text-muted-foreground hover:text-destructive">
                Отозвать согласие и удалить аккаунт
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Отозвать согласие?</AlertDialogTitle>
                <AlertDialogDescription>
                  Это приведёт к удалению аккаунта и всех ваших данных. Активная подписка не возвращается.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleWithdraw}
                  disabled={withdrawing}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {withdrawing ? 'Обработка…' : 'Да, удалить'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </DialogContent>
    </Dialog>
  );
}
