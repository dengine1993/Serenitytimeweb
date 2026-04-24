import { useState } from 'react';
import { Brain, Trash2, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { useAiMemoryStats } from '@/hooks/useAiMemoryStats';
import { toast } from 'sonner';

export default function AiMemorySettings() {
  const { count, enabled, loading, setMemoryEnabled, clearMemory } = useAiMemoryStats();
  const [busy, setBusy] = useState(false);

  const handleToggle = async (next: boolean) => {
    try {
      await setMemoryEnabled(next);
      toast.success(next ? 'ИИ снова будет помнить тебя' : 'Память ИИ отключена');
    } catch {
      toast.error('Не удалось обновить настройку');
    }
  };

  const handleClear = async () => {
    setBusy(true);
    try {
      const n = await clearMemory();
      toast.success(`Память очищена (${n} записей)`);
    } catch {
      toast.error('Не удалось очистить память');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          <Brain className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">Память Jiva</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            ИИ запоминает важные факты из ваших разговоров: триггеры, победы, практики — и
            опирается на них в следующих сессиях.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 py-2 border-t border-border/40">
        <div className="min-w-0">
          <p className="text-sm font-medium">ИИ помнит меня</p>
          <p className="text-[11px] text-muted-foreground">
            {loading
              ? 'Загрузка…'
              : enabled
                ? `Сейчас сохранено ${count} ${plural(count)} о тебе`
                : 'Память отключена — ИИ начинает каждый разговор «с чистого листа»'}
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={handleToggle} disabled={loading} />
      </div>

      {count > 0 && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full" disabled={busy}>
              {busy ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Очистить всю память ИИ
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Очистить память ИИ?</AlertDialogTitle>
              <AlertDialogDescription>
                ИИ забудет всё, что узнал о тебе в прошлых разговорах ({count}{' '}
                {plural(count)}). История чатов останется, но новые сессии будут начинаться
                «с чистого листа». Это действие необратимо.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={handleClear}>Очистить</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Card>
  );
}

function plural(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'факт';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'факта';
  return 'фактов';
}
