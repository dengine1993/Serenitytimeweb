import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Cookie, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useI18n } from "@/hooks/useI18n";
import {
  getConsent,
  saveConsent,
  resetConsent,
  onChange,
  CONSENT_VERSION,
} from "@/lib/cookieConsent";

export function CookieSettings() {
  const { language, t } = useI18n();
  const isRu = language === "ru";

  const [functional, setFunctional] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [timestamp, setTimestamp] = useState<string>("");
  const [hasConsent, setHasConsent] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const sync = () => {
      const c = getConsent();
      if (c) {
        setFunctional(c.functional);
        setAnalytics(c.analytics);
        setTimestamp(c.timestamp);
        setHasConsent(true);
      } else {
        setFunctional(false);
        setAnalytics(false);
        setTimestamp("");
        setHasConsent(false);
      }
      setDirty(false);
    };
    sync();
    return onChange(sync);
  }, []);

  const handleSave = () => {
    saveConsent({ functional, analytics });
    toast.success(isRu ? "Настройки cookies сохранены" : "Cookie settings saved");
    setDirty(false);
  };

  const handleReset = () => {
    resetConsent();
    toast.success(isRu ? "Выбор сброшен. Баннер появится снова." : "Choice reset. Banner will reappear.");
  };

  const formattedDate = timestamp
    ? format(new Date(timestamp), "d MMM yyyy, HH:mm", { locale: isRu ? ru : undefined })
    : null;

  return (
    <Card className="glass-card p-5 border-border/50">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
          <Cookie className="w-5 h-5 text-amber-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">
            {isRu ? "Управление cookies" : "Cookie management"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isRu ? "Категории файлов cookie на этом устройстве" : "Cookie categories on this device"}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <Row
          title={isRu ? "Необходимые" : "Necessary"}
          desc={isRu ? "Сессия, безопасность. Всегда включены." : "Session, security. Always on."}
          checked
          disabled
        />
        <Row
          title={isRu ? "Функциональные" : "Functional"}
          desc={isRu ? "Язык, тема, предпочтения." : "Language, theme, preferences."}
          checked={functional}
          onChange={(v) => { setFunctional(v); setDirty(true); }}
        />
        <Row
          title={isRu ? "Аналитические" : "Analytics"}
          desc={isRu ? "Обезличенная статистика использования." : "Anonymized usage statistics."}
          checked={analytics}
          onChange={(v) => { setAnalytics(v); setDirty(true); }}
        />
      </div>

      <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground space-y-0.5">
          {hasConsent && formattedDate ? (
            <>
              <div>{isRu ? "Принято:" : "Accepted:"} {formattedDate}</div>
              <div>{isRu ? "Версия политики:" : "Policy version:"} v{CONSENT_VERSION}</div>
            </>
          ) : (
            <div>{isRu ? "Выбор ещё не сделан" : "No choice made yet"}</div>
          )}
          <Link to="/cookies" className="text-primary underline hover:text-primary/80 inline-block mt-1">
            {isRu ? "Политика cookies" : "Cookie policy"}
          </Link>
        </div>
        <div className="flex gap-2">
          {hasConsent && (
            <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
              {isRu ? "Сбросить" : "Reset"}
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={!dirty}>
            {isRu ? "Сохранить" : "Save"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Row({
  title,
  desc,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  desc: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/30">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground flex items-center gap-2">
          {title}
          {disabled && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              always on
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
        className="mt-1 shrink-0"
      />
    </div>
  );
}
