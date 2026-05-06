-- 1. Drop trigger and function for SMER -> Jiva ingest
DROP TRIGGER IF EXISTS trg_smer_enqueue_jiva ON public.smer_entries;
DROP FUNCTION IF EXISTS public.enqueue_smer_entry_for_jiva();

-- 2. Clean Jiva queues from SMER source
DELETE FROM public.jiva_ingest_queue WHERE source_type = 'smer';
DELETE FROM public.jiva_memory_chunks WHERE source_type = 'smer';

-- 3. Drop the SMER table entirely
DROP TABLE IF EXISTS public.smer_entries CASCADE;

-- 4. Remove SMER PDF export tracking columns from profiles
ALTER TABLE public.profiles 
  DROP COLUMN IF EXISTS last_smer_pdf_export_at,
  DROP COLUMN IF EXISTS last_smer_pdf_export_url;