-- Agent Interrupts Table
-- Stores human-in-the-loop interrupts for tool approvals
-- Created: 2025-10-28

CREATE TABLE IF NOT EXISTS public.agent_interrupts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id text NOT NULL,
  thread_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id text NOT NULL,
  
  -- Interrupt status
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'edited', 'timeout')),
  
  -- Interrupt payload (action_request, config, description)
  interrupt_payload jsonb NOT NULL,
  
  -- User response (when resolved)
  response jsonb,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  
  -- Indexes for fast lookups
  CONSTRAINT unique_execution_interrupt UNIQUE (execution_id)
);

-- Index for finding pending interrupts by execution_id (most common query)
CREATE INDEX IF NOT EXISTS idx_interrupts_execution_id 
  ON public.agent_interrupts(execution_id);

-- Index for finding pending interrupts by user
CREATE INDEX IF NOT EXISTS idx_interrupts_user_pending 
  ON public.agent_interrupts(user_id, status) 
  WHERE status = 'pending';

-- Index for finding interrupts by thread
CREATE INDEX IF NOT EXISTS idx_interrupts_thread_id 
  ON public.agent_interrupts(thread_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_agent_interrupt_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status != 'pending' AND OLD.status = 'pending' THEN
    NEW.resolved_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agent_interrupt_timestamp
  BEFORE UPDATE ON public.agent_interrupts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_agent_interrupt_timestamp();

-- RLS Policies
ALTER TABLE public.agent_interrupts ENABLE ROW LEVEL SECURITY;

-- Users can view their own interrupts
CREATE POLICY "Users can view their own interrupts"
  ON public.agent_interrupts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert interrupts
CREATE POLICY "Service role can insert interrupts"
  ON public.agent_interrupts
  FOR INSERT
  WITH CHECK (true);

-- Users can update their own pending interrupts (to respond)
CREATE POLICY "Users can update their own pending interrupts"
  ON public.agent_interrupts
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

-- Service role can update any interrupt
CREATE POLICY "Service role can update interrupts"
  ON public.agent_interrupts
  FOR UPDATE
  USING (true);

-- Auto-cleanup old interrupts (older than 24 hours)
-- This prevents the table from growing indefinitely
CREATE OR REPLACE FUNCTION public.cleanup_old_interrupts()
RETURNS void AS $$
BEGIN
  DELETE FROM public.agent_interrupts
  WHERE created_at < now() - INTERVAL '24 hours'
    AND status != 'pending';
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE public.agent_interrupts IS 'Stores human-in-the-loop interrupts for tool approvals during agent execution';
COMMENT ON COLUMN public.agent_interrupts.execution_id IS 'Unique execution ID from ExecutionManager';
COMMENT ON COLUMN public.agent_interrupts.thread_id IS 'LangGraph thread ID for checkpointer';
COMMENT ON COLUMN public.agent_interrupts.interrupt_payload IS 'Full interrupt payload from LangGraph (action_request, config, description)';
COMMENT ON COLUMN public.agent_interrupts.response IS 'User response when interrupt is resolved (type: accept/reject/edit, args)';
