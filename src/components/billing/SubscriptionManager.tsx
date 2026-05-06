import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Crown, Calendar, Loader2, XCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
// usePricing больше не нужен здесь — годовая подписка удалена.
import { toast } from 'sonner';

interface SubscriptionData {
  id: string;
  plan: string;
  status: string;
  current_period_end: string | null;
  auto_renew: boolean | null;
  billing_interval: string | null;
  canceled_at: string | null;
  yookassa_payment_method_id: string | null;
}

export function SubscriptionManager() {
  const { user, session } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    if (user) fetchSubscription();
  }, [user]);

  const fetchSubscription = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('id, plan, status, current_period_end, auto_renew, billing_interval, canceled_at, yookassa_payment_method_id')
        .eq('user_id', user.id)
        .eq('plan', 'premium')
        .eq('status', 'active')
        .maybeSingle();
      if (error) throw error;
      setSubscription(data as SubscriptionData | null);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!subscription || !session) return;
    setCanceling(true);
    try {
      const { data, error } = await supabase.functions.invoke('cancel-subscription');
      if (error) throw error;
      setSubscription(prev => prev ? { ...prev, canceled_at: new Date().toISOString(), auto_renew: false } : null);
      toast.success(data?.message ?? 'Подписка отменена. Доступ сохранится до конца оплаченного периода.');
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast.error('Не удалось отменить подписку');
    } finally {
      setCanceling(false);
    }
  };

  // Апгрейд на годовую подписку удалён — оставлена только месячная.

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6"><div className="h-20 bg-muted rounded" /></CardContent>
      </Card>
    );
  }

  if (!subscription) return null;

  const isMonthly = subscription.billing_interval !== 'year';
  const isCanceled = !!subscription.canceled_at;
  const hasPaymentMethod = !!subscription.yookassa_payment_method_id;
  const autoRenewBroken = !isCanceled && !!subscription.auto_renew && !hasPaymentMethod;
  const endDate = subscription.current_period_end ? new Date(subscription.current_period_end) : null;
  const formattedEnd = endDate ? format(endDate, 'd MMMM yyyy', { locale: ru }) : null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-orange-400/25 bg-gradient-to-br from-orange-500/8 via-amber-500/4 to-rose-500/4 shadow-[0_20px_60px_-20px_rgba(249,115,22,0.35)]">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Crown className="h-5 w-5 text-amber-300" />
            Управление подпиской
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current plan info */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-medium">Тариф Premium</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  Месячная подписка
                </Badge>
                {isCanceled ? (
                  <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600 dark:text-amber-400">
                    Отменена
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-500 text-xs">Активна</Badge>
                )}
              </div>
            </div>
            {endDate && (
              <div className="text-right text-sm text-muted-foreground">
                <div className="flex items-center gap-1 justify-end">
                  <Calendar className="h-4 w-4" />
                  {isCanceled ? 'Доступ до' : 'Действует до'}
                </div>
                <p className="font-medium text-foreground">{formattedEnd}</p>
              </div>
            )}
          </div>

          {/* Canceled banner */}
          {isCanceled && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-amber-700 dark:text-amber-300">
                    Подписка отменена
                  </p>
                  <p className="text-amber-700/80 dark:text-amber-300/80">
                    Вы пользуетесь Premium до {formattedEnd}. После этой даты доступ к Премиум-функциям закончится — продлите вручную, чтобы продолжить.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Auto-renewal status */}
          {autoRenewBroken && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-amber-700 dark:text-amber-300">
                    Автопродление недоступно
                  </p>
                  <p className="text-amber-700/80 dark:text-amber-300/80">
                    Способ оплаты не сохранён — продлить подписку автоматически не получится.
                    За 3 дня до {formattedEnd} мы пришлём напоминание; продлите подписку вручную,
                    и тогда автопродление снова заработает.
                  </p>
                </div>
              </div>
            </div>
          )}
          {!isCanceled && subscription.auto_renew && isMonthly && hasPaymentMethod && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300">
              ✓ Подписка продлевается автоматически {formattedEnd}. Можно отменить в любой момент — доступ сохранится до конца оплаченного периода.
            </div>
          )}
          {!isCanceled && !subscription.auto_renew && (
            <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              ℹ️ Автопродление отключено. За 3 дня до окончания мы пришлём напоминание — продлите вручную, чтобы сохранить доступ.
            </div>
          )}

          {/* Годовая подписка удалена — апгрейд и yearly-баннер сняты. */}

          {/* Cancel button (not shown if already canceled) */}
          {!isCanceled && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="w-full text-muted-foreground hover:text-destructive">
                  <XCircle className="w-4 h-4 mr-2" />
                  Отменить подписку
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Отменить подписку Premium?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Доступ ко всем Премиум-функциям сохранится до {formattedEnd}.
                    После этой даты вы перейдёте на бесплатный тариф «Дыхание».
                    Отмену можно сделать в любой момент — оплаченный период не сгорает.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={canceling}>Не отменять</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancel} disabled={canceling}>
                    {canceling && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Да, отменить
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
