-- Create consent_log table for tracking all consent events
CREATE TABLE public.consent_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  consent_type text NOT NULL,           -- 'offer', 'privacy', 'immediate_service'
  document_version text NOT NULL,
  action text NOT NULL DEFAULT 'accepted', -- 'accepted' | 'withdrawn'
  context text NOT NULL,                -- 'registration', 'payment_premium', 'payment_topup'
  ip_address text,
  user_agent text,
  payment_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.consent_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own consent history
CREATE POLICY "Users can view own consent log"
  ON public.consent_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own consent records
CREATE POLICY "Users can insert own consent log"
  ON public.consent_log
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_consent_log_user ON public.consent_log(user_id);
CREATE INDEX idx_consent_log_created ON public.consent_log(created_at DESC);

-- Add comment for documentation
COMMENT ON TABLE public.consent_log IS 'Immutable log of all user consent events per 152-FZ requirements';