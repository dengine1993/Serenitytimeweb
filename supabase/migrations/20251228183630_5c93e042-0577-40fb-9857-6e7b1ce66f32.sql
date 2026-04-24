-- Add monthly art analysis quota tracking fields to usage_counters
ALTER TABLE public.usage_counters 
ADD COLUMN IF NOT EXISTS art_analyses_month integer DEFAULT 0;

ALTER TABLE public.usage_counters 
ADD COLUMN IF NOT EXISTS art_analyses_month_reset date DEFAULT CURRENT_DATE;