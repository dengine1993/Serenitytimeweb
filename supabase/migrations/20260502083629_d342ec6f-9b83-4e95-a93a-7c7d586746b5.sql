-- 1. Журнал событий с ПДн
CREATE TABLE IF NOT EXISTS public.pdn_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event_type text NOT NULL,
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pdn_audit_user ON public.pdn_audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pdn_audit_type ON public.pdn_audit_log(event_type, created_at DESC);

ALTER TABLE public.pdn_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_read_pdn_audit"
  ON public.pdn_audit_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- INSERT only via service_role (edge functions). No INSERT policy = blocked for users.

-- 2. Инциденты ПДн
CREATE TABLE IF NOT EXISTS public.security_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type text NOT NULL,
  severity text NOT NULL,
  title text NOT NULL,
  description text,
  discovered_at timestamptz NOT NULL DEFAULT now(),
  affected_users_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'new',
  rkn_notified_at timestamptz,
  rkn_reference text,
  resolution_notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_severity CHECK (severity IN ('low','medium','high','critical')),
  CONSTRAINT chk_status CHECK (status IN ('new','investigating','reported_to_rkn','resolved')),
  CONSTRAINT chk_type CHECK (incident_type IN ('data_leak','unauthorized_access','system_compromise','auto_detected','other'))
);

CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.security_incidents(status, severity);
CREATE INDEX IF NOT EXISTS idx_incidents_created ON public.security_incidents(created_at DESC);

ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_all_incidents"
  ON public.security_incidents FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_incidents_updated_at
  BEFORE UPDATE ON public.security_incidents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Журнал удалений (только хеши, без ПДн)
CREATE TABLE IF NOT EXISTS public.data_deletion_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_hash text NOT NULL,
  user_id_hash text NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  reason text NOT NULL DEFAULT 'user_request',
  CONSTRAINT chk_reason CHECK (reason IN ('user_request','admin_action','inactivity','consent_withdrawn','underage','other'))
);

CREATE INDEX IF NOT EXISTS idx_deletion_log_date ON public.data_deletion_log(deleted_at DESC);

ALTER TABLE public.data_deletion_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_read_deletion_log"
  ON public.data_deletion_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. Расширение profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS age_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS special_category_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS special_category_consent_withdrawn_at timestamptz;

COMMENT ON COLUMN public.profiles.age_confirmed_at IS '152-ФЗ: подтверждение возраста 16+ при регистрации';
COMMENT ON COLUMN public.profiles.special_category_consent_at IS '152-ФЗ ст.10: согласие на обработку спец. категории ПДн (психоэмоциональное состояние)';
COMMENT ON COLUMN public.profiles.special_category_consent_withdrawn_at IS '152-ФЗ: отзыв согласия на спец. категорию (через 30 дней — авто-удаление)';