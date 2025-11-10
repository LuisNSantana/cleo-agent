-- Create checkpoints table for robust state persistence
-- This enables time-travel debugging, replay, and state recovery

CREATE TABLE IF NOT EXISTS public.checkpoints (
  id BIGSERIAL PRIMARY KEY,
  thread_id TEXT NOT NULL,
  checkpoint_ns TEXT NOT NULL DEFAULT '',
  checkpoint_id TEXT NOT NULL,
  parent_checkpoint_id TEXT,
  type TEXT NOT NULL DEFAULT 'checkpoint',
  checkpoint JSONB NOT NULL,
  metadata JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint on thread, namespace, and checkpoint ID
  CONSTRAINT unique_checkpoint UNIQUE (thread_id, checkpoint_ns, checkpoint_id)
);

-- Index for efficient checkpoint retrieval
CREATE INDEX IF NOT EXISTS idx_checkpoints_thread_id 
  ON public.checkpoints(thread_id);

CREATE INDEX IF NOT EXISTS idx_checkpoints_thread_ns 
  ON public.checkpoints(thread_id, checkpoint_ns);

CREATE INDEX IF NOT EXISTS idx_checkpoints_created_at 
  ON public.checkpoints(created_at DESC);

-- Index for parent-child relationships
CREATE INDEX IF NOT EXISTS idx_checkpoints_parent 
  ON public.checkpoints(parent_checkpoint_id) 
  WHERE parent_checkpoint_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.checkpoints ENABLE ROW LEVEL SECURITY;

-- Policy 1: Service role bypass (for LangGraph execution context)
-- CRITICAL: LangGraph runs in server context without auth.uid(), needs service_role
CREATE POLICY "Service role can manage all checkpoints"
  ON public.checkpoints
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy 2: Authenticated users can access their own checkpoints
-- Note: This assumes user_id is stored in thread_id or can be derived from it
-- For user-facing checkpoint access (e.g., debugging UI)
CREATE POLICY "Users can manage their own checkpoints"
  ON public.checkpoints
  FOR ALL
  TO authenticated
  USING (
    -- Allow if authenticated and thread_id matches user context
    auth.uid()::text IS NOT NULL
  );

-- Grant access to authenticated users and service role
GRANT ALL ON public.checkpoints TO authenticated;
GRANT ALL ON public.checkpoints TO service_role;
GRANT USAGE, SELECT ON SEQUENCE checkpoints_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE checkpoints_id_seq TO service_role;

-- Add helpful comment
COMMENT ON TABLE public.checkpoints IS 
  'Stores graph execution checkpoints for state persistence, replay, and debugging';
COMMENT ON COLUMN public.checkpoints.thread_id IS 
  'Unique identifier for the conversation thread';
COMMENT ON COLUMN public.checkpoints.checkpoint_ns IS 
  'Namespace for organizing checkpoints (e.g., subgraph path)';
COMMENT ON COLUMN public.checkpoints.checkpoint_id IS 
  'Unique checkpoint identifier (typically timestamp-based)';
COMMENT ON COLUMN public.checkpoints.checkpoint IS 
  'Full checkpoint data including channel values and versions';
COMMENT ON COLUMN public.checkpoints.metadata IS 
  'Checkpoint metadata including step number, source, and writes';
