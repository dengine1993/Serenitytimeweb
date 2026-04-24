-- Drop triggers with correct names
DROP TRIGGER IF EXISTS trg_update_previous_feedback ON researcher_messages;
DROP TRIGGER IF EXISTS trg_populate_trial_demographics ON trial_sessions;
DROP TRIGGER IF EXISTS trg_populate_trial_session_demographics ON trial_sessions;

-- Drop functions with CASCADE to handle remaining dependencies
DROP FUNCTION IF EXISTS public.generate_training_example(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.mark_conversion_triggers(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.update_session_metrics(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.populate_trial_session_demographics() CASCADE;
DROP FUNCTION IF EXISTS public.compute_implicit_feedback(uuid, uuid, text, timestamptz) CASCADE;
DROP FUNCTION IF EXISTS public.update_previous_feedback() CASCADE;
DROP FUNCTION IF EXISTS public.update_session_evaluation_timestamp() CASCADE;