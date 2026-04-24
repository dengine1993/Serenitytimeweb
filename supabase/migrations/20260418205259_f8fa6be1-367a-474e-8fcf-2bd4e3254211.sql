-- Включить/выключить долгосрочную память AI-Психолога
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_memory_enabled boolean NOT NULL DEFAULT true;