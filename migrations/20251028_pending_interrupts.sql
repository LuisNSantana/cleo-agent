-- Migration: Add pending_interrupts table for HITL approval storage
-- Date: 2025-10-28
-- Purpose: Store interrupt state across serverless function instances

CREATE TABLE IF NOT EXISTS pending_interrupts (
  execution_id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  user_id UUID,
  agent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'edited')),
  interrupt_payload JSONB NOT NULL,
  response_payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '5 minutes'
);

-- Index for quick lookups by execution_id
CREATE INDEX IF NOT EXISTS idx_pending_interrupts_execution_id ON pending_interrupts(execution_id);

-- Index for quick lookups by user_id (for admin/debugging)
CREATE INDEX IF NOT EXISTS idx_pending_interrupts_user_id ON pending_interrupts(user_id);

-- Index for cleanup of expired interrupts
CREATE INDEX IF NOT EXISTS idx_pending_interrupts_expires_at ON pending_interrupts(expires_at);

-- RLS policies (allow users to see their own interrupts)
ALTER TABLE pending_interrupts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own interrupts"
  ON pending_interrupts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all interrupts"
  ON pending_interrupts
  FOR ALL
  USING (auth.role() = 'service_role');

-- Function to automatically clean up expired interrupts
CREATE OR REPLACE FUNCTION cleanup_expired_interrupts()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM pending_interrupts
  WHERE expires_at < NOW()
  AND status = 'pending';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Schedule cleanup function (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-expired-interrupts', '*/5 * * * *', 'SELECT cleanup_expired_interrupts()');

COMMENT ON TABLE pending_interrupts IS 'Stores pending human-in-the-loop interrupts for tool approvals across serverless instances';
COMMENT ON COLUMN pending_interrupts.execution_id IS 'Unique execution ID from LangGraph/CoreOrchestrator';
COMMENT ON COLUMN pending_interrupts.interrupt_payload IS 'Full HumanInterrupt object from LangGraph interrupt()';
COMMENT ON COLUMN pending_interrupts.response_payload IS 'User response (accept/reject/edit) stored after approval';
COMMENT ON COLUMN pending_interrupts.expires_at IS 'Automatic cleanup after 5 minutes to prevent stale interrupts';
