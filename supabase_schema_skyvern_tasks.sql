-- Skyvern Tasks Tracking Schema
-- Stores Skyvern task information for monitoring and notifications

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: skyvern_tasks
-- Stores information about Skyvern tasks for tracking and notifications
CREATE TABLE IF NOT EXISTS skyvern_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  task_id TEXT NOT NULL UNIQUE, -- Skyvern task ID
  title TEXT,
  url TEXT NOT NULL,
  instructions TEXT NOT NULL,
  task_type TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'queued',
  max_steps INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Monitoring URLs
  live_url TEXT,
  recording_url TEXT,
  dashboard_url TEXT,
  
  -- Results and metadata
  result_data JSONB,
  steps_count INTEGER DEFAULT 0,
  error_message TEXT,
  
  -- Notification tracking
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Indexes
  INDEX idx_skyvern_tasks_user_id (user_id),
  INDEX idx_skyvern_tasks_task_id (task_id),
  INDEX idx_skyvern_tasks_status (status),
  INDEX idx_skyvern_tasks_created_at (created_at DESC),
  
  -- Foreign key constraint
  CONSTRAINT fk_skyvern_tasks_user_id 
    FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE
);

-- Enable Row Level Security (RLS)
ALTER TABLE skyvern_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own tasks
CREATE POLICY "Users can view their own Skyvern tasks" 
  ON skyvern_tasks 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can create their own tasks
CREATE POLICY "Users can create their own Skyvern tasks" 
  ON skyvern_tasks 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own tasks
CREATE POLICY "Users can update their own Skyvern tasks" 
  ON skyvern_tasks 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Users can delete their own tasks
CREATE POLICY "Users can delete their own Skyvern tasks" 
  ON skyvern_tasks 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Function: Update timestamp on row update
CREATE OR REPLACE FUNCTION update_skyvern_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  
  -- Set completed_at when status changes to a final state
  IF NEW.status IN ('completed', 'failed', 'terminated') AND OLD.status NOT IN ('completed', 'failed', 'terminated') THEN
    NEW.completed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update timestamp and completion tracking
CREATE TRIGGER trigger_skyvern_tasks_updated_at
  BEFORE UPDATE ON skyvern_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_skyvern_tasks_updated_at();

-- Table: skyvern_task_notifications
-- Stores notification history for task completion
CREATE TABLE IF NOT EXISTS skyvern_task_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  task_id TEXT NOT NULL,
  notification_type TEXT NOT NULL DEFAULT 'completion',
  message TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_skyvern_notifications_user_id (user_id),
  INDEX idx_skyvern_notifications_task_id (task_id),
  INDEX idx_skyvern_notifications_sent_at (sent_at DESC),
  
  -- Foreign key constraints
  CONSTRAINT fk_skyvern_notifications_user_id 
    FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE,
  CONSTRAINT fk_skyvern_notifications_task_id 
    FOREIGN KEY (task_id) 
    REFERENCES skyvern_tasks(task_id) 
    ON DELETE CASCADE
);

-- Enable Row Level Security (RLS)
ALTER TABLE skyvern_task_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own task notifications" 
  ON skyvern_task_notifications 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "System can create task notifications" 
  ON skyvern_task_notifications 
  FOR INSERT 
  WITH CHECK (true); -- Allow system to create notifications

-- Function: Auto-create notification when task completes
CREATE OR REPLACE FUNCTION notify_task_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for status changes to completed states
  IF NEW.status IN ('completed', 'failed', 'terminated') AND OLD.status NOT IN ('completed', 'failed', 'terminated') THEN
    
    -- Insert notification
    INSERT INTO skyvern_task_notifications (user_id, task_id, notification_type, message)
    VALUES (
      NEW.user_id,
      NEW.task_id,
      'completion',
      CASE 
        WHEN NEW.status = 'completed' THEN 
          'Your Skyvern task "' || COALESCE(NEW.title, 'Automation Task') || '" has completed successfully! 🎉'
        WHEN NEW.status = 'failed' THEN 
          'Your Skyvern task "' || COALESCE(NEW.title, 'Automation Task') || '" has failed. ❌'
        WHEN NEW.status = 'terminated' THEN 
          'Your Skyvern task "' || COALESCE(NEW.title, 'Automation Task') || '" was terminated. ⏹️'
      END
    );
    
    -- Mark notification as sent
    NEW.notification_sent = TRUE;
    NEW.notification_sent_at = NOW();
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-notify on task completion
CREATE TRIGGER trigger_notify_task_completion
  BEFORE UPDATE ON skyvern_tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_completion();

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_skyvern_tasks_user_status ON skyvern_tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_skyvern_tasks_notification_pending ON skyvern_tasks(user_id, notification_sent) WHERE notification_sent = FALSE;
