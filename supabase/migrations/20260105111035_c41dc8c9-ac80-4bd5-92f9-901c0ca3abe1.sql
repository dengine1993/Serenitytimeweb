-- =====================================================
-- Fix soul_profiles Multiple Permissive Policies (4 warnings)
-- Replace FOR ALL with separate INSERT/UPDATE/DELETE policies
-- =====================================================

-- Drop existing policies that cause conflicts
DROP POLICY IF EXISTS "Manage own soul_profile" ON soul_profiles;
DROP POLICY IF EXISTS "Select soul_profiles" ON soul_profiles;

-- Create separate policies for INSERT, UPDATE, DELETE (no SELECT overlap)
CREATE POLICY "Insert own soul_profile" ON soul_profiles
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Update own soul_profile" ON soul_profiles
FOR UPDATE USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Delete own soul_profile" ON soul_profiles
FOR DELETE USING ((select auth.uid()) = user_id);

-- Single SELECT policy (combines viewing own + active profiles)
CREATE POLICY "Select soul_profiles" ON soul_profiles
FOR SELECT USING (
  is_active = true
  OR (select auth.uid()) = user_id
);