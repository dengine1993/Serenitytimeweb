-- Add consent tracking fields to profiles table for legal compliance
-- Fields for storing consent timestamps, versions, and IP addresses

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS offer_accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS offer_version TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS privacy_version TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS immediate_service_accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS immediate_service_version TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS disclaimer_accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS disclaimer_version TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS consent_ip TEXT DEFAULT NULL;