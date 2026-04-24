import { useState, useEffect, useMemo, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Crown, RefreshCw, Save, AlertTriangle, Undo2, History, Eye, Check, Wind } from 'lucide-react';
import { cn } from '@/lib/utils';

type ProductId = 'premium_subscription_monthly' | 'premium_subscription_yearly';

interface ProductRow {
  id: ProductId;
  name: string;
  description: string;
  price: number;       // current edited value
  savedPrice: number;  // last value loaded from DB
  min: number;
  max: number;
}

interface HistoryEntry {
  id: string;
  created_at: string;
  admin_id: string;
  admin_name?: string;
  details: { diff?: Record<string, { old: number; new: number }> } | null;
}

const INITIAL: ProductRow[] = [
  {
    id: 'premium_subscription_monthly',
    name: 'Premium Monthly',
    description: 'Ежемесячная подписка «Опора»',
    price: 690,
    savedPrice: 690,
    min: 290,
    max: 1990,
  },
  {
    id: 'premium_subscription_yearly',
    name: 'Premium Yearly',
    description: 'Годовая подписка «Опора»',
    price: 6990,
    savedPrice: 6990,
    min: 1990,
    max: 19990,
  },
];

const formatRub = (n: number) => `${n.toLocaleString('ru-RU')} ₽`;
const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function AdminPricing() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<ProductRow[]>(INITIAL);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadPrices = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'product_catalog')
        .maybeSingle();
      if (error) throw error;

      const parsed = typeof data?.value === 'string' ? JSON.parse(data.value) : data?.value;
      const dbProducts = (parsed?.products ?? {}) as Record<string, { amount?: { value?: number } }>;
      setProducts(prev => prev.map(p => {
        const v = dbProducts[p.id]?.amount?.value;
        const next = typeof v === 'number' ? v : p.savedPrice;
        return { ...p, price: next, savedPrice: next };
      }));
    } catch (err) {
      console.error('[admin-pricing] load:', err);
      toast.error('Не удалось загрузить цены');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_logs')
        .select('id, created_at, admin_id, details')
        .eq('action', 'update_pricing')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;

      const rows = (data ?? []) as HistoryEntry[];
      const ids = Array.from(new Set(rows.map(r => r.admin_id)));
      let nameMap: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, display_name, username')
          .in('user_id', ids);
        nameMap = Object.fromEntries(
          (profs ?? []).map(p => [p.user_id, p.display_name || p.username || p.user_id.slice(0, 8)])
        );
      }
      setHistory(rows.map(r => ({ ...r, admin_name: nameMap[r.admin_id] ?? r.admin_id.slice(0, 8) })));
    } catch (err) {
      console.error('[admin-pricing] history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrices();
    loadHistory();
  }, [loadPrices, loadHistory]);

  const monthly = products.find(p => p.id === 'premium_subscription_monthly')!;
  const yearly = products.find(p => p.id === 'premium_subscription_yearly')!;

  const dirty = useMemo(() => products.some(p => p.price !== p.savedPrice), [products]);
  const yearlyWarning = yearly.price > monthly.price * 12;
  const monthlyEquivalent = Math.round(yearly.price / 12);
  const yearlySavings = monthly.price * 12 - yearly.price;
  const yearlyDiscount = monthly.price > 0 ? Math.round((yearlySavings / (monthly.price * 12)) * 100) : 0;
  const freeMonths = monthly.price > 0 ? Math.round(yearlySavings / monthly.price) : 0;

  const setPrice = (id: ProductId, value: number) => {
    if (!Number.isFinite(value)) return;
    setProducts(prev => prev.map(p => p.id === id ? { ...p, price: Math.max(1, Math.round(value)) } : p));
  };

  const reset = () => {
    setProducts(prev => prev.map(p => ({ ...p, price: p.savedPrice })));
  };

  const saveAll = async () => {
    if (!dirty) return;
    const updates = products
      .filter(p => p.price !== p.savedPrice)
      .map(p => ({ productId: p.id, newPrice: p.price }));

    if (updates.some(u => u.newPrice <= 0)) {
      toast.error('Цена должна быть больше 0');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-pricing', {
        body: { mode: 'bulk_update', updates },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Unknown error');
      toast.success('Цены обновлены');
      await Promise.all([loadPrices(), loadHistory()]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка обновления';
      console.error('[admin-pricing] save:', err);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Цены подписки" description="Единый источник: app_config.product_catalog">
      {/* Sticky action bar */}
      <div className="sticky top-0 z-10 -mx-4 md:mx-0 px-4 md:px-0 py-3 bg-background/80 backdrop-blur border-b border-border/50 flex items-center justify-between gap-2 mb-6">
        <div className="flex items-center gap-2 min-w-0">
          {dirty ? (
            <Badge variant="outline" className="border-amber-500/40 text-amber-400 bg-amber-500/10">
              Есть несохранённые изменения
            </Badge>
          ) : (
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
              Всё сохранено
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={reset} disabled={!dirty || saving}>
            <Undo2 className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Откатить</span>
          </Button>
          <Button variant="outline" size="sm" onClick={loadPrices} disabled={loading || saving}>
            <RefreshCw className={cn('w-4 h-4 md:mr-2', loading && 'animate-spin')} />
            <span className="hidden md:inline">Обновить</span>
          </Button>
          <Button size="sm" onClick={saveAll} disabled={!dirty || saving}>
            {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Сохранить всё
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Info */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Изменение цен применяется мгновенно</p>
              <p className="text-muted-foreground">
                Новые платежи в ЮKassa создаются с новой ценой. Активные подписки не затрагиваются до следующего периода.
                Все открытые вкладки приложения обновятся автоматически.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Monthly */}
        <PriceCard
          row={monthly}
          onChange={v => setPrice(monthly.id, v)}
          subtitle="Базовая подписка"
        />

        {/* Yearly */}
        <PriceCard
          row={yearly}
          onChange={v => setPrice(yearly.id, v)}
          subtitle="Длинный горизонт"
          extra={
            <div className="space-y-2 text-sm">
              <Row label="Месячный эквивалент" value={formatRub(monthlyEquivalent) + ' / мес'} />
              <Row
                label="Экономия за год"
                value={
                  yearlySavings > 0
                    ? `${formatRub(yearlySavings)} (≈ ${freeMonths} мес. в подарок)`
                    : '—'
                }
              />
              <Row label="Скидка от месячной" value={yearlyDiscount > 0 ? `${yearlyDiscount}%` : '—'} />
              {yearlyWarning && (
                <div className="flex items-start gap-2 p-2 rounded-md bg-destructive/10 border border-destructive/30 text-destructive">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span className="text-xs">
                    Годовая ({formatRub(yearly.price)}) дороже 12 месячных ({formatRub(monthly.price * 12)}). Скидки нет.
                  </span>
                </div>
              )}
            </div>
          }
        />

        {/* User preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="w-4 h-4" />
              Как увидит пользователь
            </CardTitle>
            <CardDescription>Превью карточек на странице /premium</CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-3">
            <PreviewCard
              tag="ДЫХАНИЕ"
              icon={<Wind className="w-3.5 h-3.5 text-emerald-500" />}
              title="Тариф «Дыхание»"
              subtitle="Скорая помощь в моменте"
              price="Бесплатно"
              accent="emerald"
            />
            <PreviewCard
              tag="ОПОРА"
              icon={<Crown className="w-3.5 h-3.5 text-primary" />}
              title="Тариф «Опора»"
              subtitle="Глубокая работа с состоянием"
              price={`${formatRub(monthly.price)}/мес`}
              hint={`или ${formatRub(yearly.price)}/год · ${formatRub(monthlyEquivalent)}/мес`}
              accent="primary"
              featured
            />
          </CardContent>
        </Card>

        {/* History */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="w-4 h-4" />
                  История изменений
                </CardTitle>
                <CardDescription>Последние 10 правок цен</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={loadHistory} disabled={historyLoading}>
                <RefreshCw className={cn('w-4 h-4', historyLoading && 'animate-spin')} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Изменений пока не было</p>
            ) : (
              <div className="space-y-2">
                {history.map(h => {
                  const diff = h.details?.diff || {};
                  const entries = Object.entries(diff);
                  return (
                    <div key={h.id} className="p-3 rounded-lg bg-muted/30 border border-border/50 text-sm">
                      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                        <span className="text-xs text-muted-foreground">{formatDate(h.created_at)}</span>
                        <span className="text-xs font-medium">{h.admin_name}</span>
                      </div>
                      {entries.length === 0 ? (
                        <span className="text-xs text-muted-foreground">нет данных</span>
                      ) : (
                        <ul className="space-y-1">
                          {entries.map(([pid, d]) => (
                            <li key={pid} className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="text-xs text-muted-foreground truncate">{pid}</span>
                              <span className="text-xs font-mono">
                                <span className="line-through text-muted-foreground">{formatRub(d.old)}</span>
                                <span className="mx-1">→</span>
                                <span className="text-emerald-400">{formatRub(d.new)}</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function PriceCard({
  row,
  onChange,
  subtitle,
  extra,
}: {
  row: ProductRow;
  onChange: (v: number) => void;
  subtitle: string;
  extra?: React.ReactNode;
}) {
  const dirty = row.price !== row.savedPrice;
  return (
    <Card className={cn('transition-colors', dirty && 'border-amber-500/40')}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Crown className="w-4 h-4 text-primary" />
              {row.name}
            </CardTitle>
            <CardDescription>{subtitle} · {row.description}</CardDescription>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-muted-foreground">В БД</p>
            <p className="text-sm font-medium">{formatRub(row.savedPrice)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`price-${row.id}`}>Цена, ₽</Label>
          <div className="relative">
            <Input
              id={`price-${row.id}`}
              type="number"
              inputMode="numeric"
              value={row.price}
              onChange={e => onChange(parseInt(e.target.value, 10))}
              min={1}
              max={row.max}
              className={cn('h-12 text-2xl font-semibold pr-10', dirty && 'border-amber-500/60')}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">₽</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatRub(row.min)}</span>
            <span>{formatRub(row.max)}</span>
          </div>
          <Slider
            value={[Math.min(Math.max(row.price, row.min), row.max)]}
            min={row.min}
            max={row.max}
            step={10}
            onValueChange={([v]) => onChange(v)}
          />
        </div>

        {extra && (
          <>
            <Separator />
            {extra}
          </>
        )}

        {dirty && (
          <div className="flex items-center gap-2 text-xs text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            Изменено с {formatRub(row.savedPrice)} → {formatRub(row.price)}. Нажмите «Сохранить всё».
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PreviewCard({
  tag, icon, title, subtitle, price, hint, accent, featured,
}: {
  tag: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  price: string;
  hint?: string;
  accent: 'emerald' | 'primary';
  featured?: boolean;
}) {
  return (
    <div
      className={cn(
        'p-4 rounded-xl border-2',
        featured ? 'border-primary bg-primary/5' : 'border-border'
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className={cn(
            'text-[10px] font-medium px-2 py-0.5 rounded-full',
            accent === 'emerald' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary'
          )}
        >
          {tag}
        </span>
        {icon}
      </div>
      <h4 className="font-semibold text-sm">{title}</h4>
      <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      <p className="text-lg font-bold mt-2">{price}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
      <div className="mt-3 space-y-1">
        <PreviewFeature text={featured ? 'Безлимит AI с памятью' : '3 ознакомительных сообщения'} />
        <PreviewFeature text={featured ? '3 арт-анализа в день' : 'SOS, дыхание, дневник'} />
      </div>
    </div>
  );
}

function PreviewFeature({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
      <Check className="w-3 h-3 text-primary mt-0.5 shrink-0" />
      <span>{text}</span>
    </div>
  );
}
