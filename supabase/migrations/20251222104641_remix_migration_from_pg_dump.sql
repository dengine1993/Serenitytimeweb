CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: get_trial_days_remaining(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_trial_days_remaining(user_id_param uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN (
    SELECT 
      CASE 
        WHEN trial_started_at IS NULL OR trial_ended_at IS NOT NULL THEN 0
        ELSE GREATEST(0, 7 - EXTRACT(day FROM NOW() - trial_started_at)::INTEGER)
      END
    FROM profiles 
    WHERE id = user_id_param
  );
END;
$$;


--
-- Name: handle_new_user_trial(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user_trial() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Set trial_started_at to current timestamp for new user
  UPDATE public.profiles
  SET trial_started_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;


--
-- Name: handle_reaction_notification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_reaction_notification() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  post_owner_id UUID;
BEGIN
  -- Get the post owner
  SELECT user_id INTO post_owner_id
  FROM posts
  WHERE id = NEW.post_id;
  
  -- Only create notification if the reactor is not the post owner
  IF post_owner_id IS NOT NULL AND post_owner_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, post_id, actor_id, reaction_type)
    VALUES (post_owner_id, NEW.post_id, NEW.user_id, NEW.reaction_type);
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: is_in_trial(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_in_trial(user_id_param uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN (
    SELECT 
      trial_started_at IS NOT NULL 
      AND trial_ended_at IS NULL 
      AND (NOW() - trial_started_at) < INTERVAL '7 days'
    FROM profiles 
    WHERE id = user_id_param
  );
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: admin_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid NOT NULL,
    action text NOT NULL,
    target_type text,
    target_id uuid,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: admin_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: app_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: blog_articles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_articles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    content text NOT NULL,
    excerpt text,
    author_id uuid,
    published boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    cover_image_url text,
    published_at timestamp with time zone
);


--
-- Name: challenge_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.challenge_participants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    challenge_id uuid NOT NULL,
    user_id uuid NOT NULL,
    progress integer DEFAULT 0 NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: challenges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    duration_days integer DEFAULT 7 NOT NULL,
    difficulty text DEFAULT 'medium'::text NOT NULL,
    category text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    participants_count integer DEFAULT 0 NOT NULL
);


--
-- Name: conversation_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversation_participants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text,
    last_message_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: emotion_calendar; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emotion_calendar (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date date NOT NULL,
    emotion text NOT NULL,
    intensity integer DEFAULT 5 NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: jiva_admin_kv; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jiva_admin_kv (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: jiva_embed_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jiva_embed_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ts timestamp with time zone DEFAULT now() NOT NULL,
    items integer DEFAULT 0 NOT NULL,
    prompt_tokens integer DEFAULT 0 NOT NULL,
    total_tokens integer DEFAULT 0 NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: jiva_ingest_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jiva_ingest_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    source text,
    qtype text,
    text text,
    error text,
    processed_at timestamp with time zone
);


--
-- Name: jiva_memory_chunks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jiva_memory_chunks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    text text NOT NULL,
    type text NOT NULL,
    embedding public.vector(1536),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    text_hash text,
    meta jsonb DEFAULT '{}'::jsonb
);


--
-- Name: jiva_sessions_v2; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jiva_sessions_v2 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    status text DEFAULT 'available'::text NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: jiva_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jiva_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    tone text DEFAULT 'warm'::text NOT NULL,
    weekly_advice text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: jiva_usage_daily; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jiva_usage_daily (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date date NOT NULL,
    chunks integer DEFAULT 0 NOT NULL,
    prompt_tokens integer DEFAULT 0 NOT NULL,
    total_tokens integer DEFAULT 0 NOT NULL,
    cost_rub numeric(10,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: llm_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.llm_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    model text NOT NULL,
    prompt_tokens integer DEFAULT 0 NOT NULL,
    completion_tokens integer DEFAULT 0 NOT NULL,
    total_tokens integer DEFAULT 0 NOT NULL,
    cost_rub numeric(10,4) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    content text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: mood_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mood_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    mood text NOT NULL,
    note text,
    entry_date date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mood_entries_mood_check CHECK ((mood = ANY (ARRAY['joy'::text, 'calm'::text, 'anxiety'::text, 'sadness'::text, 'anger'::text, 'fatigue'::text, 'fear'::text])))
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    post_id uuid NOT NULL,
    actor_id uuid NOT NULL,
    reaction_type text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notifications_reaction_type_check CHECK ((reaction_type = ANY (ARRAY['heart'::text, 'star'::text])))
);


--
-- Name: post_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    user_id uuid NOT NULL,
    reaction_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT post_reactions_reaction_type_check CHECK ((reaction_type = ANY (ARRAY['heart'::text, 'star'::text])))
);

ALTER TABLE ONLY public.post_reactions REPLICA IDENTITY FULL;


--
-- Name: posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    emotion text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.posts REPLICA IDENTITY FULL;


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text,
    full_name text,
    avatar_url text,
    gender text,
    is_admin boolean DEFAULT false,
    onboarding_context jsonb DEFAULT '{}'::jsonb,
    welcome_audio_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    referral_code text,
    trial_started_at timestamp with time zone,
    trial_ended_at timestamp with time zone,
    creator_letter_shown boolean DEFAULT false,
    blocked_at timestamp with time zone,
    CONSTRAINT profiles_gender_check CHECK ((gender = ANY (ARRAY['male'::text, 'female'::text, 'other'::text, 'prefer_not_to_say'::text])))
);

ALTER TABLE ONLY public.profiles REPLICA IDENTITY FULL;


--
-- Name: referrals_v2; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referrals_v2 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    inviter_user_id uuid NOT NULL,
    invitee_user_id uuid NOT NULL,
    code text NOT NULL,
    inviter_reward_days integer DEFAULT 0 NOT NULL,
    invitee_discount_pct integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: researcher_usage_daily; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.researcher_usage_daily (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date date NOT NULL,
    messages_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: smer_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.smer_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    situation text NOT NULL,
    thoughts text NOT NULL,
    emotions jsonb DEFAULT '[]'::jsonb NOT NULL,
    reaction text,
    alternative_reaction text,
    entry_date date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: soul_matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.soul_matches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    matched_user_id uuid NOT NULL,
    compatibility_score integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    conversation_id uuid
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    plan text NOT NULL,
    status text NOT NULL,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: system_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: usage_counters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usage_counters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    period_start timestamp with time zone DEFAULT now() NOT NULL,
    period_end timestamp with time zone NOT NULL,
    navigator_messages_day integer DEFAULT 0 NOT NULL,
    researcher_messages_day integer DEFAULT 0 NOT NULL,
    voice_minutes_month integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    jiva_sessions_week integer DEFAULT 0 NOT NULL,
    jiva_extra_sessions_purchased integer DEFAULT 0 NOT NULL
);


--
-- Name: user_art_therapy_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_art_therapy_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    image_base64 text NOT NULL,
    analysis_text text NOT NULL,
    tags text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_navigator_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_navigator_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    item_type text NOT NULL,
    item_id text NOT NULL,
    status text DEFAULT 'viewed'::text,
    practice_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: voice_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.voice_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    text_hash text NOT NULL,
    audio_path text NOT NULL,
    type text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_logs admin_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_logs
    ADD CONSTRAINT admin_logs_pkey PRIMARY KEY (id);


--
-- Name: admin_settings admin_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_settings
    ADD CONSTRAINT admin_settings_key_key UNIQUE (key);


--
-- Name: admin_settings admin_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_settings
    ADD CONSTRAINT admin_settings_pkey PRIMARY KEY (id);


--
-- Name: app_config app_config_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_config
    ADD CONSTRAINT app_config_key_key UNIQUE (key);


--
-- Name: app_config app_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_config
    ADD CONSTRAINT app_config_pkey PRIMARY KEY (id);


--
-- Name: blog_articles blog_articles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_articles
    ADD CONSTRAINT blog_articles_pkey PRIMARY KEY (id);


--
-- Name: blog_articles blog_articles_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_articles
    ADD CONSTRAINT blog_articles_slug_key UNIQUE (slug);


--
-- Name: challenge_participants challenge_participants_challenge_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_participants
    ADD CONSTRAINT challenge_participants_challenge_id_user_id_key UNIQUE (challenge_id, user_id);


--
-- Name: challenge_participants challenge_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_participants
    ADD CONSTRAINT challenge_participants_pkey PRIMARY KEY (id);


--
-- Name: challenges challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenges
    ADD CONSTRAINT challenges_pkey PRIMARY KEY (id);


--
-- Name: conversation_participants conversation_participants_conversation_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_conversation_id_user_id_key UNIQUE (conversation_id, user_id);


--
-- Name: conversation_participants conversation_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: emotion_calendar emotion_calendar_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emotion_calendar
    ADD CONSTRAINT emotion_calendar_pkey PRIMARY KEY (id);


--
-- Name: emotion_calendar emotion_calendar_user_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emotion_calendar
    ADD CONSTRAINT emotion_calendar_user_id_date_key UNIQUE (user_id, date);


--
-- Name: jiva_admin_kv jiva_admin_kv_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jiva_admin_kv
    ADD CONSTRAINT jiva_admin_kv_key_key UNIQUE (key);


--
-- Name: jiva_admin_kv jiva_admin_kv_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jiva_admin_kv
    ADD CONSTRAINT jiva_admin_kv_pkey PRIMARY KEY (id);


--
-- Name: jiva_embed_usage jiva_embed_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jiva_embed_usage
    ADD CONSTRAINT jiva_embed_usage_pkey PRIMARY KEY (id);


--
-- Name: jiva_ingest_queue jiva_ingest_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jiva_ingest_queue
    ADD CONSTRAINT jiva_ingest_queue_pkey PRIMARY KEY (id);


--
-- Name: jiva_memory_chunks jiva_memory_chunks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jiva_memory_chunks
    ADD CONSTRAINT jiva_memory_chunks_pkey PRIMARY KEY (id);


--
-- Name: jiva_sessions_v2 jiva_sessions_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jiva_sessions_v2
    ADD CONSTRAINT jiva_sessions_v2_pkey PRIMARY KEY (id);


--
-- Name: jiva_settings jiva_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jiva_settings
    ADD CONSTRAINT jiva_settings_pkey PRIMARY KEY (id);


--
-- Name: jiva_settings jiva_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jiva_settings
    ADD CONSTRAINT jiva_settings_user_id_key UNIQUE (user_id);


--
-- Name: jiva_usage_daily jiva_usage_daily_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jiva_usage_daily
    ADD CONSTRAINT jiva_usage_daily_date_key UNIQUE (date);


--
-- Name: jiva_usage_daily jiva_usage_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jiva_usage_daily
    ADD CONSTRAINT jiva_usage_daily_pkey PRIMARY KEY (id);


--
-- Name: llm_usage llm_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.llm_usage
    ADD CONSTRAINT llm_usage_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: mood_entries mood_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mood_entries
    ADD CONSTRAINT mood_entries_pkey PRIMARY KEY (id);


--
-- Name: mood_entries mood_entries_user_id_entry_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mood_entries
    ADD CONSTRAINT mood_entries_user_id_entry_date_key UNIQUE (user_id, entry_date);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: post_reactions post_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_reactions
    ADD CONSTRAINT post_reactions_pkey PRIMARY KEY (id);


--
-- Name: post_reactions post_reactions_post_id_user_id_reaction_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_reactions
    ADD CONSTRAINT post_reactions_post_id_user_id_reaction_type_key UNIQUE (post_id, user_id, reaction_type);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_referral_code_key UNIQUE (referral_code);


--
-- Name: referrals_v2 referrals_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals_v2
    ADD CONSTRAINT referrals_v2_pkey PRIMARY KEY (id);


--
-- Name: researcher_usage_daily researcher_usage_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.researcher_usage_daily
    ADD CONSTRAINT researcher_usage_daily_pkey PRIMARY KEY (id);


--
-- Name: researcher_usage_daily researcher_usage_daily_user_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.researcher_usage_daily
    ADD CONSTRAINT researcher_usage_daily_user_id_date_key UNIQUE (user_id, date);


--
-- Name: smer_entries smer_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smer_entries
    ADD CONSTRAINT smer_entries_pkey PRIMARY KEY (id);


--
-- Name: soul_matches soul_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.soul_matches
    ADD CONSTRAINT soul_matches_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: system_notifications system_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_notifications
    ADD CONSTRAINT system_notifications_pkey PRIMARY KEY (id);


--
-- Name: usage_counters usage_counters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_counters
    ADD CONSTRAINT usage_counters_pkey PRIMARY KEY (id);


--
-- Name: usage_counters usage_counters_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_counters
    ADD CONSTRAINT usage_counters_user_id_key UNIQUE (user_id);


--
-- Name: user_art_therapy_entries user_art_therapy_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_art_therapy_entries
    ADD CONSTRAINT user_art_therapy_entries_pkey PRIMARY KEY (id);


--
-- Name: user_navigator_progress user_navigator_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_navigator_progress
    ADD CONSTRAINT user_navigator_progress_pkey PRIMARY KEY (id);


--
-- Name: user_navigator_progress user_navigator_progress_user_id_item_type_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_navigator_progress
    ADD CONSTRAINT user_navigator_progress_user_id_item_type_item_id_key UNIQUE (user_id, item_type, item_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: voice_cache voice_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voice_cache
    ADD CONSTRAINT voice_cache_pkey PRIMARY KEY (id);


--
-- Name: voice_cache voice_cache_text_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voice_cache
    ADD CONSTRAINT voice_cache_text_hash_key UNIQUE (text_hash);


--
-- Name: idx_admin_logs_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_logs_admin_id ON public.admin_logs USING btree (admin_id);


--
-- Name: idx_admin_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_logs_created_at ON public.admin_logs USING btree (created_at DESC);


--
-- Name: idx_art_therapy_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_art_therapy_created_at ON public.user_art_therapy_entries USING btree (created_at DESC);


--
-- Name: idx_art_therapy_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_art_therapy_user_id ON public.user_art_therapy_entries USING btree (user_id);


--
-- Name: idx_challenge_participants_challenge_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_challenge_participants_challenge_id ON public.challenge_participants USING btree (challenge_id);


--
-- Name: idx_challenge_participants_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_challenge_participants_user_id ON public.challenge_participants USING btree (user_id);


--
-- Name: idx_conversation_participants_conversation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_participants_conversation_id ON public.conversation_participants USING btree (conversation_id);


--
-- Name: idx_conversation_participants_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_participants_user_id ON public.conversation_participants USING btree (user_id);


--
-- Name: idx_emotion_calendar_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emotion_calendar_date ON public.emotion_calendar USING btree (date);


--
-- Name: idx_emotion_calendar_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emotion_calendar_user_id ON public.emotion_calendar USING btree (user_id);


--
-- Name: idx_jiva_ingest_queue_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jiva_ingest_queue_status ON public.jiva_ingest_queue USING btree (status);


--
-- Name: idx_jiva_ingest_queue_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jiva_ingest_queue_user_id ON public.jiva_ingest_queue USING btree (user_id);


--
-- Name: idx_jiva_memory_chunks_text_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_jiva_memory_chunks_text_hash ON public.jiva_memory_chunks USING btree (text_hash) WHERE (text_hash IS NOT NULL);


--
-- Name: idx_jiva_memory_chunks_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jiva_memory_chunks_type ON public.jiva_memory_chunks USING btree (type);


--
-- Name: idx_jiva_memory_chunks_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jiva_memory_chunks_user_id ON public.jiva_memory_chunks USING btree (user_id);


--
-- Name: idx_messages_conversation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_conversation_id ON public.messages USING btree (conversation_id);


--
-- Name: idx_messages_sender_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_sender_id ON public.messages USING btree (sender_id);


--
-- Name: idx_mood_entries_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mood_entries_user_date ON public.mood_entries USING btree (user_id, entry_date DESC);


--
-- Name: idx_navigator_progress_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_navigator_progress_item ON public.user_navigator_progress USING btree (item_type, item_id);


--
-- Name: idx_navigator_progress_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_navigator_progress_user_id ON public.user_navigator_progress USING btree (user_id);


--
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_post_reactions_post_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_post_reactions_post_id ON public.post_reactions USING btree (post_id);


--
-- Name: idx_post_reactions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_post_reactions_user_id ON public.post_reactions USING btree (user_id);


--
-- Name: idx_posts_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_posts_user_id ON public.posts USING btree (user_id);


--
-- Name: idx_profiles_blocked_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_blocked_at ON public.profiles USING btree (blocked_at);


--
-- Name: idx_profiles_onboarding_context; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_onboarding_context ON public.profiles USING gin (onboarding_context);


--
-- Name: idx_smer_entries_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_smer_entries_user_date ON public.smer_entries USING btree (user_id, entry_date DESC);


--
-- Name: idx_soul_matches_matched_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_soul_matches_matched_user_id ON public.soul_matches USING btree (matched_user_id);


--
-- Name: idx_soul_matches_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_soul_matches_user_id ON public.soul_matches USING btree (user_id);


--
-- Name: idx_system_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_notifications_created_at ON public.system_notifications USING btree (created_at DESC);


--
-- Name: idx_system_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_notifications_user_id ON public.system_notifications USING btree (user_id);


--
-- Name: idx_voice_cache_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_voice_cache_hash ON public.voice_cache USING btree (text_hash);


--
-- Name: profiles on_profile_created_start_trial; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_profile_created_start_trial AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_trial();


--
-- Name: post_reactions on_reaction_created; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_reaction_created AFTER INSERT ON public.post_reactions FOR EACH ROW EXECUTE FUNCTION public.handle_reaction_notification();


--
-- Name: mood_entries update_mood_entries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_mood_entries_updated_at BEFORE UPDATE ON public.mood_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: smer_entries update_smer_entries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_smer_entries_updated_at BEFORE UPDATE ON public.smer_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: admin_logs admin_logs_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_logs
    ADD CONSTRAINT admin_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: blog_articles blog_articles_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_articles
    ADD CONSTRAINT blog_articles_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: challenge_participants challenge_participants_challenge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_participants
    ADD CONSTRAINT challenge_participants_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.challenges(id) ON DELETE CASCADE;


--
-- Name: challenge_participants challenge_participants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_participants
    ADD CONSTRAINT challenge_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: conversation_participants conversation_participants_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: conversation_participants conversation_participants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: emotion_calendar emotion_calendar_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emotion_calendar
    ADD CONSTRAINT emotion_calendar_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: jiva_ingest_queue jiva_ingest_queue_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jiva_ingest_queue
    ADD CONSTRAINT jiva_ingest_queue_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: jiva_memory_chunks jiva_memory_chunks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jiva_memory_chunks
    ADD CONSTRAINT jiva_memory_chunks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: jiva_sessions_v2 jiva_sessions_v2_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jiva_sessions_v2
    ADD CONSTRAINT jiva_sessions_v2_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: jiva_settings jiva_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jiva_settings
    ADD CONSTRAINT jiva_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: llm_usage llm_usage_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.llm_usage
    ADD CONSTRAINT llm_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mood_entries mood_entries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mood_entries
    ADD CONSTRAINT mood_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: post_reactions post_reactions_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_reactions
    ADD CONSTRAINT post_reactions_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: posts posts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: referrals_v2 referrals_v2_invitee_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals_v2
    ADD CONSTRAINT referrals_v2_invitee_user_id_fkey FOREIGN KEY (invitee_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: referrals_v2 referrals_v2_inviter_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals_v2
    ADD CONSTRAINT referrals_v2_inviter_user_id_fkey FOREIGN KEY (inviter_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: researcher_usage_daily researcher_usage_daily_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.researcher_usage_daily
    ADD CONSTRAINT researcher_usage_daily_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: soul_matches soul_matches_matched_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.soul_matches
    ADD CONSTRAINT soul_matches_matched_user_id_fkey FOREIGN KEY (matched_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: soul_matches soul_matches_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.soul_matches
    ADD CONSTRAINT soul_matches_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: system_notifications system_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_notifications
    ADD CONSTRAINT system_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: usage_counters usage_counters_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_counters
    ADD CONSTRAINT usage_counters_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_navigator_progress user_navigator_progress_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_navigator_progress
    ADD CONSTRAINT user_navigator_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: blog_articles Admins can manage all articles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all articles" ON public.blog_articles USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));


--
-- Name: voice_cache Anyone can read voice cache; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read voice cache" ON public.voice_cache FOR SELECT USING (true);


--
-- Name: app_config App config viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "App config viewable by everyone" ON public.app_config FOR SELECT USING (true);


--
-- Name: blog_articles Authors can manage own articles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authors can manage own articles" ON public.blog_articles USING ((auth.uid() = author_id));


--
-- Name: challenges Challenges viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Challenges viewable by everyone" ON public.challenges FOR SELECT USING (true);


--
-- Name: admin_settings Only admins can manage admin settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can manage admin settings" ON public.admin_settings USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));


--
-- Name: challenges Only admins can manage challenges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can manage challenges" ON public.challenges USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));


--
-- Name: jiva_admin_kv Only admins can manage kv; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can manage kv" ON public.jiva_admin_kv USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));


--
-- Name: user_roles Only admins can manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can manage roles" ON public.user_roles USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));


--
-- Name: app_config Only admins can modify app config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can modify app config" ON public.app_config USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));


--
-- Name: admin_logs Only admins can view admin logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can view admin logs" ON public.admin_logs FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));


--
-- Name: jiva_embed_usage Only admins can view embed usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can view embed usage" ON public.jiva_embed_usage FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));


--
-- Name: jiva_usage_daily Only admins can view usage daily; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can view usage daily" ON public.jiva_usage_daily USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));


--
-- Name: posts Posts viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Posts viewable by everyone" ON public.posts FOR SELECT USING (true);


--
-- Name: profiles Public profiles viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);


--
-- Name: blog_articles Published articles viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Published articles viewable by everyone" ON public.blog_articles FOR SELECT USING ((published = true));


--
-- Name: post_reactions Reactions viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Reactions viewable by everyone" ON public.post_reactions FOR SELECT USING (true);


--
-- Name: admin_logs Service role can insert admin logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert admin logs" ON public.admin_logs FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));


--
-- Name: llm_usage Service role can insert llm usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert llm usage" ON public.llm_usage FOR INSERT WITH CHECK ((auth.role() = 'service_role'::text));


--
-- Name: voice_cache Service role can insert voice cache; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert voice cache" ON public.voice_cache FOR INSERT WITH CHECK (true);


--
-- Name: jiva_memory_chunks Service role can manage all memory chunks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage all memory chunks" ON public.jiva_memory_chunks USING ((auth.role() = 'service_role'::text));


--
-- Name: jiva_ingest_queue Service role can manage queue; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage queue" ON public.jiva_ingest_queue USING ((auth.role() = 'service_role'::text));


--
-- Name: soul_matches Users can create matches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create matches" ON public.soul_matches FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: messages Users can create messages in their conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create messages in their conversations" ON public.messages FOR INSERT WITH CHECK (((auth.uid() = sender_id) AND (EXISTS ( SELECT 1
   FROM public.conversation_participants
  WHERE ((conversation_participants.conversation_id = messages.conversation_id) AND (conversation_participants.user_id = auth.uid()))))));


--
-- Name: user_art_therapy_entries Users can create own art therapy entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own art therapy entries" ON public.user_art_therapy_entries FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: challenge_participants Users can create own participation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own participation" ON public.challenge_participants FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: posts Users can create own posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own posts" ON public.posts FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: conversation_participants Users can create participation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create participation" ON public.conversation_participants FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: post_reactions Users can create reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create reactions" ON public.post_reactions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: referrals_v2 Users can create referrals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create referrals" ON public.referrals_v2 FOR INSERT WITH CHECK ((auth.uid() = invitee_user_id));


--
-- Name: smer_entries Users can delete own SMER entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own SMER entries" ON public.smer_entries FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: user_art_therapy_entries Users can delete own art therapy entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own art therapy entries" ON public.user_art_therapy_entries FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: emotion_calendar Users can delete own calendar; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own calendar" ON public.emotion_calendar FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: mood_entries Users can delete own mood entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own mood entries" ON public.mood_entries FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: user_navigator_progress Users can delete own navigator progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own navigator progress" ON public.user_navigator_progress FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: posts Users can delete own posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own posts" ON public.posts FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: post_reactions Users can delete own reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own reactions" ON public.post_reactions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: smer_entries Users can insert own SMER entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own SMER entries" ON public.smer_entries FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: emotion_calendar Users can insert own calendar; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own calendar" ON public.emotion_calendar FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: mood_entries Users can insert own mood entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own mood entries" ON public.mood_entries FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_navigator_progress Users can insert own navigator progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own navigator progress" ON public.user_navigator_progress FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: jiva_sessions_v2 Users can insert own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own sessions" ON public.jiva_sessions_v2 FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: jiva_settings Users can insert own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own settings" ON public.jiva_settings FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: subscriptions Users can insert own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own subscriptions" ON public.subscriptions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: researcher_usage_daily Users can insert own usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own usage" ON public.researcher_usage_daily FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: usage_counters Users can insert own usage counters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own usage counters" ON public.usage_counters FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: smer_entries Users can update own SMER entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own SMER entries" ON public.smer_entries FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: emotion_calendar Users can update own calendar; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own calendar" ON public.emotion_calendar FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: soul_matches Users can update own matches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own matches" ON public.soul_matches FOR UPDATE USING (((auth.uid() = user_id) OR (auth.uid() = matched_user_id)));


--
-- Name: messages Users can update own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own messages" ON public.messages FOR UPDATE USING ((auth.uid() = sender_id));


--
-- Name: mood_entries Users can update own mood entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own mood entries" ON public.mood_entries FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_navigator_progress Users can update own navigator progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own navigator progress" ON public.user_navigator_progress FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: notifications Users can update own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: challenge_participants Users can update own participation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own participation" ON public.challenge_participants FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: posts Users can update own posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own posts" ON public.posts FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: jiva_sessions_v2 Users can update own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own sessions" ON public.jiva_sessions_v2 FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: jiva_settings Users can update own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own settings" ON public.jiva_settings FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: subscriptions Users can update own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own subscriptions" ON public.subscriptions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: system_notifications Users can update own system notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own system notifications" ON public.system_notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: researcher_usage_daily Users can update own usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own usage" ON public.researcher_usage_daily FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: usage_counters Users can update own usage counters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own usage counters" ON public.usage_counters FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: conversations Users can view conversations they're part of; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view conversations they're part of" ON public.conversations FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.conversation_participants
  WHERE ((conversation_participants.conversation_id = conversations.id) AND (conversation_participants.user_id = auth.uid())))));


--
-- Name: messages Users can view messages in their conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view messages in their conversations" ON public.messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.conversation_participants
  WHERE ((conversation_participants.conversation_id = messages.conversation_id) AND (conversation_participants.user_id = auth.uid())))));


--
-- Name: smer_entries Users can view own SMER entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own SMER entries" ON public.smer_entries FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_art_therapy_entries Users can view own art therapy entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own art therapy entries" ON public.user_art_therapy_entries FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: emotion_calendar Users can view own calendar; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own calendar" ON public.emotion_calendar FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: llm_usage Users can view own llm usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own llm usage" ON public.llm_usage FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: soul_matches Users can view own matches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own matches" ON public.soul_matches FOR SELECT USING (((auth.uid() = user_id) OR (auth.uid() = matched_user_id)));


--
-- Name: jiva_memory_chunks Users can view own memory chunks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own memory chunks" ON public.jiva_memory_chunks FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: mood_entries Users can view own mood entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own mood entries" ON public.mood_entries FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_navigator_progress Users can view own navigator progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own navigator progress" ON public.user_navigator_progress FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: notifications Users can view own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: challenge_participants Users can view own participation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own participation" ON public.challenge_participants FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: conversation_participants Users can view own participation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own participation" ON public.conversation_participants FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: jiva_sessions_v2 Users can view own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own sessions" ON public.jiva_sessions_v2 FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: jiva_settings Users can view own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own settings" ON public.jiva_settings FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: subscriptions Users can view own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: system_notifications Users can view own system notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own system notifications" ON public.system_notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: researcher_usage_daily Users can view own usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own usage" ON public.researcher_usage_daily FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: usage_counters Users can view own usage counters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own usage counters" ON public.usage_counters FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: referrals_v2 Users can view referrals they're part of; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view referrals they're part of" ON public.referrals_v2 FOR SELECT USING (((auth.uid() = inviter_user_id) OR (auth.uid() = invitee_user_id)));


--
-- Name: admin_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: app_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

--
-- Name: blog_articles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blog_articles ENABLE ROW LEVEL SECURITY;

--
-- Name: challenge_participants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;

--
-- Name: challenges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: conversation_participants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

--
-- Name: conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: emotion_calendar; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.emotion_calendar ENABLE ROW LEVEL SECURITY;

--
-- Name: jiva_admin_kv; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.jiva_admin_kv ENABLE ROW LEVEL SECURITY;

--
-- Name: jiva_embed_usage; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.jiva_embed_usage ENABLE ROW LEVEL SECURITY;

--
-- Name: jiva_ingest_queue; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.jiva_ingest_queue ENABLE ROW LEVEL SECURITY;

--
-- Name: jiva_memory_chunks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.jiva_memory_chunks ENABLE ROW LEVEL SECURITY;

--
-- Name: jiva_sessions_v2; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.jiva_sessions_v2 ENABLE ROW LEVEL SECURITY;

--
-- Name: jiva_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.jiva_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: jiva_usage_daily; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.jiva_usage_daily ENABLE ROW LEVEL SECURITY;

--
-- Name: llm_usage; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.llm_usage ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: mood_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: post_reactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

--
-- Name: posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: referrals_v2; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referrals_v2 ENABLE ROW LEVEL SECURITY;

--
-- Name: researcher_usage_daily; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.researcher_usage_daily ENABLE ROW LEVEL SECURITY;

--
-- Name: smer_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.smer_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: soul_matches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.soul_matches ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: system_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: usage_counters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

--
-- Name: user_art_therapy_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_art_therapy_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: user_navigator_progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_navigator_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: voice_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.voice_cache ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;