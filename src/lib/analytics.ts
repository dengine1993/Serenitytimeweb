// Analytics events for funnel tracking and cost monitoring

export type AnalyticsEvent =
  | 'pwa_installed'
  | 'paywall_view'
  | 'checkout_init'
  | 'checkout_success'
  | 'payment_success'
  | 'premium_started'
  | 'premium_renewed'
  | 'jiva_view'
  | 'jiva_weekly_play'
  | 'jiva_play_weekly'
  | 'jiva_extra_bought'
  | 'jiva_extra_buy'
  | 'jiva_chat_message'
  | 'jiva_generate_weekly_click'
  | 'jiva_generate_weekly_done'
  | 'jiva_settings_change'
  | 'jiva_open_dialog'
  | 'jiva_breath_start'
  | 'jiva_hover_orb'
  | 'jiva_silent_toggle'
  | 'jiva_call_crisis'
  | 'crisis_open'
  | 'ab_assignment_pricing'
  | 'referral_link_copied'
  | 'referral_link_visited';

interface AnalyticsProps {
  [key: string]: string | number | boolean | undefined;
}

export function trackEvent(event: AnalyticsEvent, props?: AnalyticsProps) {
  // Log to console in development
  if (import.meta.env.DEV) {
    console.log('[Analytics]', event, props);
  }

  // Send to backend for aggregation
  if (typeof window !== 'undefined' && 'gtag' in window) {
    (window as any).gtag('event', event, props);
  }

  // Could also send to Supabase analytics table
  // or external service like PostHog, Amplitude, etc.
}

export function trackCost(
  userId: string,
  costType: 'llm',
  amount: number,
  tokens?: number
) {
  trackEvent('cost_tracking' as AnalyticsEvent, {
    user_id: userId,
    cost_type: costType,
    amount_rub: amount,
    tokens
  });
}
