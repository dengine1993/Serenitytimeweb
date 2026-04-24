import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Crown, Calendar, RefreshCw, ArrowUpCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePricing } from '@/hooks/usePricing';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SubscriptionData {
  id: string;
  plan: string;
  status: string;
  current_period_end: string | null;
  auto_renew: boolean | null;
  billing_interval: string | null;
}

export function SubscriptionManager() {
  const { user, session } = useAuth();
  const { premiumYearly, premiumMonthly, yearlySavings } = usePricing();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingAutoRenew, setUpdatingAutoRenew] = useState(false);
  const [upgradingToYearly, setUpgradingToYearly] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSubscription();
    }
  }, [user]);

  const fetchSubscription = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('id, plan, status, current_period_end, auto_renew, billing_interval')
        .eq('user_id', user.id)
        .eq('plan', 'premium')
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;
      setSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoRenew = async () => {
    if (!subscription || !session) return;

    // Only allow for monthly subscriptions
    if (subscription.billing_interval === 'year') {
      toast.error('Автопродление недоступно для годовой подписки');
      return;
    }

    setUpdatingAutoRenew(true);
    try {
      const { error } = await supabase.functions.invoke('toggle-auto-renew', {
        body: { enable: !subscription.auto_renew }
      });

      if (error) throw error;

      setSubscription(prev => prev ? { ...prev, auto_renew: !prev.auto_renew } : null);
      toast.success(subscription.auto_renew 
        ? 'Автопродление отключено' 
        : 'Автопродление включено'
      );
    } catch (error) {
      console.error('Error toggling auto-renew:', error);
      toast.error('Не удалось изменить настройку');
    } finally {
      setUpdatingAutoRenew(false);
    }
  };

  const handleUpgradeToYearly = async () => {
    if (!subscription || !session) return;

    setUpgradingToYearly(true);
    try {
      const { data, error } = await supabase.functions.invoke('upgrade-subscription', {
        body: { targetInterval: 'year' }
      });

      if (error) throw error;

      if (data?.confirmationUrl) {
        window.location.href = data.confirmationUrl;
      }
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      toast.error('Не удалось создать платёж для апгрейда');
    } finally {
      setUpgradingToYearly(false);
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-20 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return null;
  }

  const isMonthly = subscription.billing_interval === 'month' || !subscription.billing_interval;
  const isYearly = subscription.billing_interval === 'year';
  const endDate = subscription.current_period_end 
    ? new Date(subscription.current_period_end) 
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Crown className="h-5 w-5 text-primary" />
            Управление подпиской
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current plan info */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Тариф «Опора»</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {isYearly ? 'Годовая подписка' : 'Месячная подписка'}
                </Badge>
                {subscription.status === 'active' && (
                  <Badge className="bg-emerald-500 text-xs">Активна</Badge>
                )}
              </div>
            </div>
            {endDate && (
              <div className="text-right text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Действует до
                </div>
                <p className="font-medium text-foreground">
                  {format(endDate, 'd MMMM yyyy', { locale: ru })}
                </p>
              </div>
            )}
          </div>

          {/* Auto-renew toggle (only for monthly) */}
          {isMonthly && (
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
              <div className="flex items-center gap-3">
                <RefreshCw className={cn(
                  "h-5 w-5",
                  subscription.auto_renew ? "text-primary" : "text-muted-foreground"
                )} />
                <div>
                  <Label htmlFor="auto-renew" className="font-medium cursor-pointer">
                    Автопродление
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {subscription.auto_renew 
                      ? 'Подписка продлится автоматически' 
                      : 'Подписка завершится в указанную дату'}
                  </p>
                </div>
              </div>
              <Switch
                id="auto-renew"
                checked={subscription.auto_renew ?? true}
                onCheckedChange={handleToggleAutoRenew}
                disabled={updatingAutoRenew}
              />
            </div>
          )}

          {/* Upgrade to yearly (only for monthly) */}
          {isMonthly && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowUpCircle className="h-5 w-5 text-amber-500" />
                    <span className="font-medium">Перейти на год</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Экономия {yearlySavings} ₽ в год. Оставшееся время месячной подписки добавится к годовой.
                  </p>
                </div>
                <Button
                  onClick={handleUpgradeToYearly}
                  disabled={upgradingToYearly}
                  className="shrink-0"
                  size="sm"
                >
                  {upgradingToYearly ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {premiumYearly} ₽/год
                </Button>
              </div>
            </div>
          )}

          {/* Yearly subscription info */}
          {isYearly && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                ✓ У вас годовая подписка — максимальная экономия!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
