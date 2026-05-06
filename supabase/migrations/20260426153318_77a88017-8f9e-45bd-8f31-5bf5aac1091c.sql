ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS yookassa_payment_method_id text,
  ADD COLUMN IF NOT EXISTS last_charge_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS failed_charge_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS is_recurrent boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_subscriptions_recurring_due
  ON public.subscriptions (current_period_end)
  WHERE status = 'active' AND auto_renew = true AND yookassa_payment_method_id IS NOT NULL;