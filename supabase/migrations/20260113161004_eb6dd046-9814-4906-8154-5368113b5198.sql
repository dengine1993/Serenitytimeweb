-- Add separate columns for diary and SMER PDF exports
-- Drop old combined columns if they exist
ALTER TABLE profiles 
DROP COLUMN IF EXISTS last_pdf_export_at,
DROP COLUMN IF EXISTS last_pdf_export_url;

-- Add separate columns for diary exports
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_diary_pdf_export_at timestamptz,
ADD COLUMN IF NOT EXISTS last_diary_pdf_export_url text;

-- Add separate columns for SMER exports
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_smer_pdf_export_at timestamptz,
ADD COLUMN IF NOT EXISTS last_smer_pdf_export_url text;