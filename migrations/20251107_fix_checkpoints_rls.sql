-- Fix RLS policy for checkpoints table
-- 
-- CONTEXT: LangGraph checkpoint saves were failing with error 42501
-- Root cause: checkpoints used authenticated client + RLS policies requiring user_id = auth.uid()
-- 
-- SOLUTION: Application now uses admin client (service role) for checkpoints
-- This migration is OPTIONAL - the code fix alone resolves the issue
-- 
-- Why admin client is correct:
-- - Checkpoints are internal LangGraph state (system data)
-- - Not user-facing data that needs RLS protection
-- - Admin client bypasses RLS automatically
-- - user_id still tracked for auditing (derived from thread_id)
--
-- This migration adds service_role policy as defense-in-depth,
-- but the real fix is in lib/agents/core/graph-builder.ts using getSupabaseAdmin()

-- Drop existing overly restrictive policy (if needed in future)
-- DROP POLICY IF EXISTS "Users can manage their own checkpoints" ON public.checkpoints;

-- Create service role bypass policy (defense-in-depth, not strictly needed with admin client)
CREATE POLICY IF NOT EXISTS "Service role can manage all checkpoints"
  ON public.checkpoints
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Ensure service role has all necessary grants
GRANT ALL ON public.checkpoints TO service_role;
GRANT USAGE, SELECT ON SEQUENCE checkpoints_id_seq TO service_role;

-- Verify policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd
FROM pg_policies 
WHERE tablename = 'checkpoints'
ORDER BY policyname;
