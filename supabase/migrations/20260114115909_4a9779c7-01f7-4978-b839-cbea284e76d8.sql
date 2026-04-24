-- Drop Empathy Dataset views and tables
DROP VIEW IF EXISTS public.v_empathy_training_dataset CASCADE;
DROP TABLE IF EXISTS public.session_evaluations CASCADE;

-- Drop unnecessary conversion view (not needed for basic SFT)
DROP VIEW IF EXISTS public.v_finetune_message_pairs CASCADE;

-- Clean up empathy_feedback table (was tied to session_evaluations)
DROP TABLE IF EXISTS public.empathy_feedback CASCADE;