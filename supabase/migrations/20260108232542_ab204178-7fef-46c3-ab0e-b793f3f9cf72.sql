-- Remove legacy full_name column (never populated, replaced by display_name)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS full_name;