-- =============================================
-- ADD MISSING COLUMNS TO PROFILES
-- =============================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS welcome_shown BOOLEAN DEFAULT false;

-- =============================================
-- ADD MISSING COLUMNS TO MOOD_ENTRIES
-- =============================================
ALTER TABLE public.mood_entries ADD COLUMN IF NOT EXISTS mood TEXT;
ALTER TABLE public.mood_entries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- =============================================
-- ADD MISSING COLUMNS TO SMER_ENTRIES
-- =============================================
ALTER TABLE public.smer_entries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- =============================================
-- USER_ART_THERAPY_ENTRIES TABLE
-- =============================================
CREATE TABLE public.user_art_therapy_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  image_base64 TEXT,
  analysis_text TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_art_therapy_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own art entries" ON public.user_art_therapy_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own art entries" ON public.user_art_therapy_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own art entries" ON public.user_art_therapy_entries FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- APP_CONFIG TABLE
-- =============================================
CREATE TABLE public.app_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app config" ON public.app_config FOR SELECT USING (true);

-- =============================================
-- RESEARCHER_USAGE_DAILY TABLE
-- =============================================
CREATE TABLE public.researcher_usage_daily (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, usage_date)
);

ALTER TABLE public.researcher_usage_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage" ON public.researcher_usage_daily FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own usage" ON public.researcher_usage_daily FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own usage" ON public.researcher_usage_daily FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- RESEARCHER_MESSAGES TABLE
-- =============================================
CREATE TABLE public.researcher_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.researcher_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages" ON public.researcher_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own messages" ON public.researcher_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own messages" ON public.researcher_messages FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- CRISIS_SESSIONS TABLE
-- =============================================
CREATE TABLE public.crisis_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  intensity TEXT,
  techniques_used TEXT[],
  outcome TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.crisis_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own crisis sessions" ON public.crisis_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own crisis sessions" ON public.crisis_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- SPECIALIST_SLOTS TABLE
-- =============================================
CREATE TABLE public.specialist_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  specialist_id UUID NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  is_booked BOOLEAN DEFAULT false,
  booked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  price NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.specialist_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view available slots" ON public.specialist_slots FOR SELECT USING (true);
CREATE POLICY "Users can book slots" ON public.specialist_slots FOR UPDATE USING (auth.uid() = booked_by OR booked_by IS NULL);

-- =============================================
-- PINNED_MOMENTS TABLE
-- =============================================
CREATE TABLE public.pinned_moments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL UNIQUE,
  pinned_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pinned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pinned_moments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pinned moments" ON public.pinned_moments FOR SELECT USING (true);