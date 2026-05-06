import { supabase } from "@/integrations/supabase/client";
import { LEGAL_VERSIONS } from "./legalVersions";

type ConsentType =
  | 'offer'
  | 'privacy'
  | 'immediate_service'
  | 'disclaimer'
  | 'cross_border'
  | 'special_category'
  | 'age_16plus'
  | 'name_to_jiva';

type ConsentContext = 'registration' | 'payment_premium' | 'payment_topup' | 'reconsent' | 'settings';

interface LogConsentParams {
  consentType: ConsentType;
  context: ConsentContext;
  paymentId?: string;
}

/**
 * Версия документа для конкретного типа согласия.
 * Спец. категория, возраст 16+, name-to-jiva, cross-border — привязаны к Privacy.
 */
function getDocumentVersion(consentType: ConsentType): string {
  if (consentType === 'immediate_service') return LEGAL_VERSIONS.refund;
  if (consentType === 'disclaimer') return LEGAL_VERSIONS.disclaimer;
  if (consentType === 'cross_border' || consentType === 'special_category' || consentType === 'age_16plus' || consentType === 'name_to_jiva') {
    return LEGAL_VERSIONS.privacy;
  }
  return LEGAL_VERSIONS[consentType as 'offer' | 'privacy'];
}

interface BatchItem {
  type: ConsentType;
  version: string;
  context: ConsentContext;
  action?: 'accepted' | 'withdrawn';
  paymentId?: string;
}

/**
 * Пакетная запись согласий через edge function `save-consent`.
 * Сервер сам извлекает IP и User-Agent из заголовков (надёжнее ipify),
 * пишет в иммутабельный consent_log через service role и денормализует в profiles.
 */
async function invokeSaveConsent(consents: BatchItem[]): Promise<void> {
  if (consents.length === 0) return;
  try {
    const { error } = await supabase.functions.invoke('save-consent', {
      body: { consents },
    });
    if (error) {
      console.error('save-consent invoke error:', error);
    }
  } catch (err) {
    console.error('save-consent network error:', err);
  }
}

/**
 * Логирование одного согласия.
 */
export async function logConsent(params: LogConsentParams): Promise<void> {
  await invokeSaveConsent([{
    type: params.consentType,
    version: getDocumentVersion(params.consentType),
    context: params.context,
    paymentId: params.paymentId,
  }]);
}

/**
 * Все согласия при регистрации (152-ФЗ): offer, privacy, disclaimer,
 * special_category, age_16plus, опционально name_to_jiva.
 * Один сетевой запрос вместо пяти.
 */
export async function logRegistrationConsents(opts?: { nameToJiva?: boolean }): Promise<void> {
  const items: BatchItem[] = [
    { type: 'offer',            version: getDocumentVersion('offer'),            context: 'registration' },
    { type: 'privacy',          version: getDocumentVersion('privacy'),          context: 'registration' },
    { type: 'disclaimer',       version: getDocumentVersion('disclaimer'),       context: 'registration' },
    { type: 'special_category', version: getDocumentVersion('special_category'), context: 'registration' },
    { type: 'age_16plus',       version: getDocumentVersion('age_16plus'),       context: 'registration' },
  ];
  if (opts?.nameToJiva) {
    items.push({ type: 'name_to_jiva', version: getDocumentVersion('name_to_jiva'), context: 'registration' });
  }
  await invokeSaveConsent(items);
}

/**
 * Согласие с дисклеймером перед первым использованием AI.
 */
export async function logDisclaimerConsent(): Promise<void> {
  await logConsent({ consentType: 'disclaimer', context: 'registration' });
}

/**
 * Согласия при оплате: offer + privacy + special_category.
 */
export async function logPaymentConsents(
  context: 'payment_premium' | 'payment_topup',
  paymentId?: string
): Promise<void> {
  await invokeSaveConsent([
    { type: 'offer',            version: getDocumentVersion('offer'),            context, paymentId },
    { type: 'privacy',          version: getDocumentVersion('privacy'),          context, paymentId },
    { type: 'special_category', version: getDocumentVersion('special_category'), context, paymentId },
  ]);
}

/**
 * Повторный сбор согласий при обновлении версии документа.
 * Передаём только устаревшие типы.
 */
export async function logReconsent(types: ConsentType[]): Promise<void> {
  if (types.length === 0) return;
  await invokeSaveConsent(types.map((t) => ({
    type: t,
    version: getDocumentVersion(t),
    context: 'reconsent' as const,
  })));
}
