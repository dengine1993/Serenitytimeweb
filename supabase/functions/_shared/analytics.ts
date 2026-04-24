import { getSupabaseClient } from './db.ts';

export interface AnalyticsEventPayload {
  user_id?: string;
  event: string;
  payload?: Record<string, unknown>;
  ts?: string;
}

export async function ingestAnalyticsEvent(event: AnalyticsEventPayload): Promise<void> {
  const supabase = getSupabaseClient();
  const payload = {
    user_id: event.user_id ?? null,
    event: event.event,
    payload: event.payload ?? {},
    ts: event.ts ?? new Date().toISOString(),
  };

  const { error } = await supabase.from('jiva_events').insert(payload);
  if (error) {
    console.error('[Analytics] failed to insert event', payload, error);
    throw error;
  }
}

