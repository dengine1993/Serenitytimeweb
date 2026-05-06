import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LEGAL_VERSIONS } from "@/lib/legalVersions";

type StaleType = 'privacy' | 'special_category' | 'age_16plus' | 'offer' | 'disclaimer';

/**
 * Критичные согласия, версии которых должны соответствовать актуальным редакциям.
 * При расхождении — показываем блокирующую модалку повторного согласия.
 *
 * Возраст 16+ исключён намеренно: подтверждение возраста однократно по факту,
 * не зависит от ревизии документа.
 */
const TRACKED: { type: StaleType; current: string }[] = [
  { type: 'privacy',          current: LEGAL_VERSIONS.privacy },
  { type: 'special_category', current: LEGAL_VERSIONS.privacy },
  { type: 'offer',            current: LEGAL_VERSIONS.offer },
  { type: 'disclaimer',       current: LEGAL_VERSIONS.disclaimer },
];

export interface ConsentVersionState {
  loading: boolean;
  needsReConsent: boolean;
  staleTypes: StaleType[];
  refresh: () => void;
}

/**
 * Сравнивает последние принятые версии в consent_log с LEGAL_VERSIONS.
 * Если расходится — needsReConsent = true.
 */
export function useConsentVersionCheck(): ConsentVersionState {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [staleTypes, setStaleTypes] = useState<StaleType[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setStaleTypes([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      const stale: StaleType[] = [];

      for (const { type, current } of TRACKED) {
        const { data, error } = await supabase
          .from('consent_log')
          .select('document_version, action, created_at')
          .eq('consent_type', type)
          .order('created_at', { ascending: false })
          .limit(1);

        if (cancelled) return;
        if (error) {
          console.warn('consent version check failed:', type, error);
          continue;
        }

        const last = data?.[0];
        // Нет записи вообще — пропускаем (старые юзеры могут не иметь
        // некоторых согласий; ре-сбор покажем только если они подписывали
        // и версия устарела). Это безопасный дефолт: новые юзеры всегда
        // подписывают актуальную, старые без записи не блокируются.
        if (!last) continue;
        if (last.action === 'withdrawn') continue;
        if (last.document_version !== current) {
          stale.push(type);
        }
      }

      if (!cancelled) {
        setStaleTypes(stale);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user, tick]);

  return {
    loading,
    needsReConsent: staleTypes.length > 0,
    staleTypes,
    refresh: () => setTick((t) => t + 1),
  };
}
