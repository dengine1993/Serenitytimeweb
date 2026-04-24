import { supabase } from "@/integrations/supabase/client";
import { LEGAL_VERSIONS } from "./legalVersions";

type ConsentType = 'offer' | 'privacy' | 'immediate_service';
type ConsentContext = 'registration' | 'payment_premium' | 'payment_topup';

interface LogConsentParams {
  consentType: ConsentType;
  context: ConsentContext;
  paymentId?: string;
}

/**
 * Get client IP address (best effort)
 */
async function getClientIp(): Promise<string> {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    return data.ip || '';
  } catch {
    return '';
  }
}

/**
 * Get document version for consent type
 */
function getDocumentVersion(consentType: ConsentType): string {
  if (consentType === 'immediate_service') {
    return LEGAL_VERSIONS.refund;
  }
  return LEGAL_VERSIONS[consentType];
}

/**
 * Log a single consent event to consent_log table
 * This creates an immutable record per 152-FZ requirements
 */
export async function logConsent(params: LogConsentParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('Cannot log consent: no authenticated user');
      return;
    }

    const version = getDocumentVersion(params.consentType);
    const ipAddress = await getClientIp();

    const { error } = await supabase.from('consent_log').insert({
      user_id: user.id,
      consent_type: params.consentType,
      document_version: version,
      action: 'accepted',
      context: params.context,
      ip_address: ipAddress || null,
      user_agent: navigator.userAgent,
      payment_id: params.paymentId || null
    });

    if (error) {
      console.error('Failed to log consent:', error);
    }
  } catch (error) {
    console.error('Error logging consent:', error);
  }
}

/**
 * Log all registration consents (offer + privacy)
 */
export async function logRegistrationConsents(): Promise<void> {
  await Promise.all([
    logConsent({ consentType: 'offer', context: 'registration' }),
    logConsent({ consentType: 'privacy', context: 'registration' })
  ]);
}

/**
 * Log all payment consents (offer + privacy + immediate_service)
 */
export async function logPaymentConsents(
  context: 'payment_premium' | 'payment_topup',
  paymentId?: string
): Promise<void> {
  await Promise.all([
    logConsent({ consentType: 'offer', context, paymentId }),
    logConsent({ consentType: 'privacy', context, paymentId })
  ]);
}
