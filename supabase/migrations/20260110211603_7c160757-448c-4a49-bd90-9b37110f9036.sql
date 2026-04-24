-- Add missing columns to payments table for YooKassa integration
ALTER TABLE public.payments 
  ADD COLUMN IF NOT EXISTS yookassa_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS yookassa_confirmation_url TEXT,
  ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

-- Index for fast lookup by yookassa_payment_id
CREATE INDEX IF NOT EXISTS idx_payments_yookassa_id 
  ON public.payments(yookassa_payment_id);