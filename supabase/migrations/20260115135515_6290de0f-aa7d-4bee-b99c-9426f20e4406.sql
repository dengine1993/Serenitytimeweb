-- Add alternative_reaction column to smer_entries table
ALTER TABLE public.smer_entries 
ADD COLUMN IF NOT EXISTS alternative_reaction TEXT DEFAULT NULL;