-- =============================================
-- ADD MISSING COLUMNS TO PROFILES
-- =============================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS premium_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- =============================================
-- REFERRALS_V2 TABLE
-- =============================================
CREATE TABLE public.referrals_v2 (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inviter_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invited_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  inviter_reward_days INTEGER DEFAULT 7,
  invited_reward_days INTEGER DEFAULT 7,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.referrals_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referrals v2" ON public.referrals_v2 FOR SELECT USING (auth.uid() = inviter_user_id OR auth.uid() = invited_user_id);
CREATE POLICY "Users can create their own referrals v2" ON public.referrals_v2 FOR INSERT WITH CHECK (auth.uid() = inviter_user_id);

-- =============================================
-- ADMIN_SETTINGS TABLE
-- =============================================
CREATE TABLE public.admin_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read admin settings" ON public.admin_settings FOR SELECT USING (true);

-- =============================================
-- LLM_USAGE TABLE
-- =============================================
CREATE TABLE public.llm_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  model TEXT,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cost_usd NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.llm_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own llm usage" ON public.llm_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own llm usage" ON public.llm_usage FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- USAGE_COUNTERS TABLE
-- =============================================
CREATE TABLE public.usage_counters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  period_start DATE NOT NULL DEFAULT CURRENT_DATE,
  period_end DATE,
  navigator_messages_day INTEGER DEFAULT 0,
  jiva_sessions_week INTEGER DEFAULT 0,
  ai_messages_day INTEGER DEFAULT 0,
  art_sessions_week INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage counters" ON public.usage_counters FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own usage counters" ON public.usage_counters FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own usage counters" ON public.usage_counters FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- USER_ROLES TABLE
-- =============================================
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- =============================================
-- SPECIALIST_BOOKINGS TABLE
-- =============================================
CREATE TABLE public.specialist_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_id UUID REFERENCES public.specialist_slots(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.specialist_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bookings" ON public.specialist_bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own bookings" ON public.specialist_bookings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- AB_TESTS TABLE
-- =============================================
CREATE TABLE public.ab_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  test_name TEXT NOT NULL,
  variant TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, test_name)
);

ALTER TABLE public.ab_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ab tests" ON public.ab_tests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own ab tests" ON public.ab_tests FOR INSERT WITH CHECK (auth.uid() = user_id);