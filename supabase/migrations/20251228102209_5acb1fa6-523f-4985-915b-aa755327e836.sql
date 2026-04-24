-- =============================================
-- ADD MISSING COLUMNS TO PROFILES
-- =============================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_ended_at TIMESTAMP WITH TIME ZONE;

-- =============================================
-- ADD MISSING COLUMNS TO USAGE_COUNTERS
-- =============================================
ALTER TABLE public.usage_counters ADD COLUMN IF NOT EXISTS jiva_extra_sessions_purchased INTEGER DEFAULT 0;

-- =============================================
-- ADD MISSING COLUMNS TO LLM_USAGE
-- =============================================
ALTER TABLE public.llm_usage ADD COLUMN IF NOT EXISTS total_tokens INTEGER DEFAULT 0;
ALTER TABLE public.llm_usage ADD COLUMN IF NOT EXISTS cost_rub NUMERIC DEFAULT 0;

-- =============================================
-- JIVA_SESSIONS_V2 TABLE
-- =============================================
CREATE TABLE public.jiva_sessions_v2 (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_type TEXT,
  duration_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.jiva_sessions_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own jiva sessions" ON public.jiva_sessions_v2 FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own jiva sessions" ON public.jiva_sessions_v2 FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- ADMIN_LOGS TABLE
-- =============================================
CREATE TABLE public.admin_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Admin logs are sensitive - only admins should see them
CREATE POLICY "Admins can view admin logs" ON public.admin_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can create admin logs" ON public.admin_logs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
);

-- =============================================
-- SOUL_PROFILES TABLE (Soul Matching)
-- =============================================
CREATE TABLE public.soul_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  bio TEXT,
  looking_for TEXT,
  interests TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.soul_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view active soul profiles" ON public.soul_profiles FOR SELECT USING (is_active = true);
CREATE POLICY "Users can manage their own soul profile" ON public.soul_profiles FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- SOUL_MATCHES TABLE
-- =============================================
CREATE TABLE public.soul_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id_1 UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_id_2 UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.soul_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own matches" ON public.soul_matches FOR SELECT USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- =============================================
-- DAILY_CHECKINS TABLE
-- =============================================
CREATE TABLE public.daily_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood_score INTEGER,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, checkin_date)
);

ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own checkins" ON public.daily_checkins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own checkins" ON public.daily_checkins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own checkins" ON public.daily_checkins FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- PAYMENTS TABLE
-- =============================================
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'RUB',
  status TEXT DEFAULT 'pending',
  provider TEXT,
  external_id TEXT,
  product_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);