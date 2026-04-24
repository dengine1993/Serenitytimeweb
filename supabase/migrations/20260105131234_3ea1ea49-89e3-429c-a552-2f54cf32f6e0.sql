-- =====================================================
-- Drop unused Soul Matching tables
-- =====================================================

-- Drop tables in correct order (respecting foreign key constraints)
DROP TABLE IF EXISTS soul_matches CASCADE;
DROP TABLE IF EXISTS soul_profiles CASCADE;
DROP TABLE IF EXISTS soul_stories CASCADE;