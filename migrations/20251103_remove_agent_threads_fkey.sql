-- Migration: Remove agent_threads foreign key constraint
-- Date: 2025-11-03
-- Reason: New architecture uses chatId directly as thread_id (no lookup to agent_threads)
--
-- PROBLEM: agent_messages has FK to agent_threads, but we no longer populate agent_threads
-- SOLUTION: Drop FK constraint, allow thread_id to be any UUID (from chats.id)
--
-- This allows:
-- 1. thread_id = chatId (direct 1:1 mapping)
-- 2. No dependency on agent_threads table
-- 3. Faster inserts (no FK validation overhead)

-- Step 1: Drop the foreign key constraint
ALTER TABLE agent_messages 
  DROP CONSTRAINT IF EXISTS agent_messages_thread_id_fkey;

-- Step 2: Verify thread_id column still exists and is indexed
-- (The column itself is fine, we just removed the FK constraint)
-- Index should still exist from original schema:
-- CREATE INDEX IF NOT EXISTS idx_agent_messages_thread ON agent_messages(thread_id);

-- Step 3: Optional - Add a comment to document the new behavior
COMMENT ON COLUMN agent_messages.thread_id IS 
  'Thread ID for message isolation. Maps directly to chats.id (chatId). No FK constraint to allow flexible thread management.';

-- Verification query (run manually to check):
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'agent_messages' AND column_name = 'thread_id';
