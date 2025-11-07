-- Migration: Fix unique constraint for soft-deleted agents
-- Date: 2025-11-07
-- Issue: Users couldn't reuse agent names after soft deletion due to unique constraint
--        on (user_id, name) that applied to ALL records, including soft-deleted ones.
--
-- Solution: Replace unique constraint with a partial unique index that only applies
--           to active agents (is_active = true). This allows:
--           - Multiple soft-deleted agents with the same name (is_active = false)
--           - Only ONE active agent per name per user (is_active = true)
--
-- Error before fix:
--   duplicate key value violates unique constraint "unique_agent_name_per_user"
--   Key (user_id, name)=(e1261ded-ea04-4747-b833-742ae05ef316, Atlas) already exists.

-- Drop the existing unique constraint that applies to all records
ALTER TABLE agents DROP CONSTRAINT IF EXISTS unique_agent_name_per_user;

-- Create a new partial unique index that only applies to active agents
-- This allows soft-deleted agents (is_active = false) to have duplicate names
CREATE UNIQUE INDEX unique_active_agent_name_per_user 
ON agents (user_id, name) 
WHERE is_active = true;

-- Add a comment explaining the logic
COMMENT ON INDEX unique_active_agent_name_per_user IS 
'Ensures unique agent names per user, but only for active agents. Soft-deleted agents (is_active = false) can have duplicate names, allowing users to reuse names after deletion.';
