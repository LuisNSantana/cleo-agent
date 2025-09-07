-- Multi-Agent Task Management Schema
-- Universal task system for all agents (Apu research, Wex automation, etc.)

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Table: agent_tasks
-- Universal task management for all agents with scheduling capabilities
CREATE TABLE IF NOT EXISTS agent_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  
  -- Task identification and assignment
  task_id TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  agent_id TEXT NOT NULL, -- e.g. 'apu-research', 'wex-automation', 'cleo-supervisor'
  agent_name TEXT NOT NULL, -- e.g. 'Apu', 'Wex', 'Cleo'
  agent_avatar TEXT, -- e.g. '/img/agents/apu4.png'
  
  -- Task details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  task_type TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'scheduled', 'recurring'
  priority INTEGER DEFAULT 5, -- 1-10 (10 = highest priority)
  
  -- Task configuration (agent-specific parameters as JSON)
  task_config JSONB DEFAULT '{}', -- research queries, automation URLs, etc.
  context_data JSONB DEFAULT '{}', -- additional context for the agent
  
  -- Scheduling (for scheduled and recurring tasks)
  scheduled_at TIMESTAMP WITH TIME ZONE, -- when to run (null for immediate)
  cron_expression TEXT, -- for recurring tasks (e.g. '0 9 * * *' = daily at 9am)
  timezone TEXT DEFAULT 'UTC',
  
  -- Execution tracking
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'scheduled', 'running', 'completed', 'failed', 'cancelled'
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Results and output
  result_data JSONB, -- agent's response/output
  error_message TEXT,
  execution_time_ms INTEGER, -- how long it took to complete
  
  -- Retry logic
  max_retries INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  
  -- Notification settings
  notify_on_completion BOOLEAN DEFAULT TRUE,
  notify_on_failure BOOLEAN DEFAULT TRUE,
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  tags TEXT[] DEFAULT '{}', -- for categorization and filtering
  
  -- Indexes
  INDEX idx_agent_tasks_user_id (user_id),
  INDEX idx_agent_tasks_agent_id (agent_id),
  INDEX idx_agent_tasks_status (status),
  INDEX idx_agent_tasks_scheduled_at (scheduled_at),
  INDEX idx_agent_tasks_created_at (created_at DESC),
  INDEX idx_agent_tasks_priority (priority DESC),
  INDEX idx_agent_tasks_task_type (task_type),
  
  -- Foreign key constraint
  CONSTRAINT fk_agent_tasks_user_id 
    FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE
);

-- Enable Row Level Security (RLS)
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own tasks
CREATE POLICY "Users can view their own agent tasks" 
  ON agent_tasks 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can create their own tasks
CREATE POLICY "Users can create their own agent tasks" 
  ON agent_tasks 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own tasks
CREATE POLICY "Users can update their own agent tasks" 
  ON agent_tasks 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Users can delete their own tasks
CREATE POLICY "Users can delete their own agent tasks" 
  ON agent_tasks 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Table: agent_task_executions
-- Detailed execution history for debugging and analytics
CREATE TABLE IF NOT EXISTS agent_task_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL,
  execution_number INTEGER NOT NULL, -- 1, 2, 3... for retries
  
  -- Execution details
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed'
  
  -- Agent communication logs
  agent_messages JSONB DEFAULT '[]', -- conversation with agent
  tool_calls JSONB DEFAULT '[]', -- tools used during execution
  
  -- Results
  result_data JSONB,
  error_message TEXT,
  error_stack TEXT,
  
  -- Performance metrics
  execution_time_ms INTEGER,
  memory_usage_mb FLOAT,
  
  -- Foreign key constraint
  CONSTRAINT fk_agent_task_executions_task_id 
    FOREIGN KEY (task_id) 
    REFERENCES agent_tasks(id) 
    ON DELETE CASCADE
);

-- Enable RLS for executions table
ALTER TABLE agent_task_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view executions of their tasks" 
  ON agent_task_executions 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM agent_tasks 
      WHERE agent_tasks.id = agent_task_executions.task_id 
      AND agent_tasks.user_id = auth.uid()
    )
  );

-- Function: Update timestamp on row update
CREATE OR REPLACE FUNCTION update_agent_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  
  -- Set completed_at when status changes to a final state
  IF NEW.status IN ('completed', 'failed', 'cancelled') AND OLD.status NOT IN ('completed', 'failed', 'cancelled') THEN
    NEW.completed_at = NOW();
  END IF;
  
  -- Set started_at when status changes to running
  IF NEW.status = 'running' AND OLD.status != 'running' THEN
    NEW.started_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update timestamp and status tracking
CREATE TRIGGER trigger_agent_tasks_updated_at
  BEFORE UPDATE ON agent_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_tasks_updated_at();

-- Function: Schedule next occurrence for recurring tasks
CREATE OR REPLACE FUNCTION schedule_next_recurring_task()
RETURNS TRIGGER AS $$
DECLARE
  next_run TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Only process recurring tasks that just completed
  IF NEW.status = 'completed' AND NEW.task_type = 'recurring' AND NEW.cron_expression IS NOT NULL THEN
    
    -- Calculate next run time based on cron expression
    -- This is a simplified example - in production you'd use a proper cron parser
    CASE 
      WHEN NEW.cron_expression = '0 9 * * *' THEN -- Daily at 9 AM
        next_run = (NEW.completed_at + INTERVAL '1 day')::date + TIME '09:00:00';
      WHEN NEW.cron_expression = '0 * * * *' THEN -- Every hour
        next_run = date_trunc('hour', NEW.completed_at) + INTERVAL '1 hour';
      WHEN NEW.cron_expression = '*/30 * * * *' THEN -- Every 30 minutes
        next_run = date_trunc('hour', NEW.completed_at) + 
                   (EXTRACT(minute FROM NEW.completed_at)::int / 30 + 1) * INTERVAL '30 minutes';
      ELSE
        -- Default: next day at same time
        next_run = NEW.completed_at + INTERVAL '1 day';
    END CASE;
    
    -- Create new scheduled task
    INSERT INTO agent_tasks (
      user_id, agent_id, agent_name, agent_avatar,
      title, description, task_type, priority,
      task_config, context_data,
      scheduled_at, cron_expression, timezone,
      status, max_retries, notify_on_completion, notify_on_failure,
      tags
    ) VALUES (
      NEW.user_id, NEW.agent_id, NEW.agent_name, NEW.agent_avatar,
      NEW.title, NEW.description, 'scheduled', NEW.priority,
      NEW.task_config, NEW.context_data,
      next_run, NEW.cron_expression, NEW.timezone,
      'scheduled', NEW.max_retries, NEW.notify_on_completion, NEW.notify_on_failure,
      NEW.tags
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-schedule recurring tasks
CREATE TRIGGER trigger_schedule_recurring_tasks
  AFTER UPDATE ON agent_tasks
  FOR EACH ROW
  EXECUTE FUNCTION schedule_next_recurring_task();

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agent_tasks_user_status ON agent_tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_scheduled_pending ON agent_tasks(scheduled_at, status) 
  WHERE status = 'scheduled' AND scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_tasks_user_agent ON agent_tasks(user_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_tags ON agent_tasks USING GIN(tags);

-- Create function for task scheduler to find ready tasks
CREATE OR REPLACE FUNCTION get_ready_scheduled_tasks()
RETURNS SETOF agent_tasks AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM agent_tasks
  WHERE status = 'scheduled'
    AND scheduled_at IS NOT NULL
    AND scheduled_at <= NOW()
  ORDER BY priority DESC, scheduled_at ASC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- Example task configurations for different agents:
-- 
-- Apu Research Task:
-- {
--   "query": "latest developments in AI agents 2025",
--   "sources": ["news", "scholar", "web"],
--   "max_results": 10,
--   "time_range": "1 week",
--   "language": "en"
-- }
--
-- Wex Automation Task:
-- {
--   "url": "https://example.com",
--   "instructions": "Fill out contact form with provided data",
--   "form_data": {"name": "John Doe", "email": "john@example.com"},
--   "max_steps": 25,
--   "screenshot_on_completion": true
-- }
--
-- Emma E-commerce Task:
-- {
--   "product_name": "iPhone 15 Pro",
--   "platforms": ["amazon", "bestbuy", "apple"],
--   "price_alerts": true,
--   "stock_monitoring": true
-- }
