-- Skyvern User Credentials Schema
-- Migration to add support for Skyvern web automation service
-- This schema follows the same pattern as shopify_user_credentials

-- Create skyvern_user_credentials table
CREATE TABLE IF NOT EXISTS skyvern_user_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Credential identification
    credential_name VARCHAR(255) NOT NULL DEFAULT 'default',
    api_key TEXT NOT NULL,
    
    -- Skyvern configuration
    base_url VARCHAR(255) NOT NULL DEFAULT 'https://api.skyvern.com',
    organization_id VARCHAR(255),
    
    -- System flags
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, credential_name)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_skyvern_user_credentials_user_id ON skyvern_user_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_skyvern_user_credentials_active ON skyvern_user_credentials(user_id, is_active) WHERE is_active = true;

-- Enable Row Level Security (RLS)
ALTER TABLE skyvern_user_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own credentials
CREATE POLICY "Users can view their own Skyvern credentials" 
ON skyvern_user_credentials FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Skyvern credentials" 
ON skyvern_user_credentials FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Skyvern credentials" 
ON skyvern_user_credentials FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Skyvern credentials" 
ON skyvern_user_credentials FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_skyvern_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_skyvern_credentials_updated_at_trigger
    BEFORE UPDATE ON skyvern_user_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_skyvern_credentials_updated_at();

-- Optional: Create a table to store Skyvern task history (for monitoring and debugging)
CREATE TABLE IF NOT EXISTS skyvern_task_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    credential_id UUID NOT NULL REFERENCES skyvern_user_credentials(id) ON DELETE CASCADE,
    
    -- Task information
    skyvern_task_id VARCHAR(255) NOT NULL, -- Skyvern's task ID (like "run_123")
    task_type VARCHAR(100) NOT NULL, -- 'task' or 'workflow'
    prompt TEXT NOT NULL,
    target_url TEXT,
    
    -- Task status
    status VARCHAR(50) NOT NULL DEFAULT 'created', -- created, queued, running, completed, failed, canceled
    
    -- Results
    output JSONB,
    error_message TEXT,
    screenshots JSONB, -- Array of screenshot URLs
    recording_url TEXT,
    
    -- Execution details
    step_count INTEGER DEFAULT 0,
    execution_time_seconds INTEGER,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indexes for task history
CREATE INDEX IF NOT EXISTS idx_skyvern_task_history_user_id ON skyvern_task_history(user_id);
CREATE INDEX IF NOT EXISTS idx_skyvern_task_history_credential_id ON skyvern_task_history(credential_id);
CREATE INDEX IF NOT EXISTS idx_skyvern_task_history_status ON skyvern_task_history(status);
CREATE INDEX IF NOT EXISTS idx_skyvern_task_history_created_at ON skyvern_task_history(created_at DESC);

-- Enable RLS for task history
ALTER TABLE skyvern_task_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task history
CREATE POLICY "Users can view their own Skyvern task history" 
ON skyvern_task_history FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Skyvern task history" 
ON skyvern_task_history FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Skyvern task history" 
ON skyvern_task_history FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to update task history timestamp
CREATE OR REPLACE FUNCTION update_skyvern_task_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    -- Automatically set completed_at when status changes to completed, failed, or canceled
    IF NEW.status IN ('completed', 'failed', 'canceled') AND OLD.status NOT IN ('completed', 'failed', 'canceled') THEN
        NEW.completed_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for task history
CREATE TRIGGER update_skyvern_task_history_updated_at_trigger
    BEFORE UPDATE ON skyvern_task_history
    FOR EACH ROW
    EXECUTE FUNCTION update_skyvern_task_history_updated_at();

-- Comments for documentation
COMMENT ON TABLE skyvern_user_credentials IS 'Stores encrypted Skyvern API credentials per user for web automation tasks';
COMMENT ON COLUMN skyvern_user_credentials.credential_name IS 'User-friendly name for the credential (e.g., "Production", "Testing")';
COMMENT ON COLUMN skyvern_user_credentials.api_key IS 'Encrypted Skyvern API key';
COMMENT ON COLUMN skyvern_user_credentials.base_url IS 'Skyvern API base URL (default: https://api.skyvern.com)';
COMMENT ON COLUMN skyvern_user_credentials.organization_id IS 'Optional Skyvern organization ID for enterprise accounts';

COMMENT ON TABLE skyvern_task_history IS 'Audit log of all Skyvern automation tasks executed by users';
COMMENT ON COLUMN skyvern_task_history.skyvern_task_id IS 'The unique task ID returned by Skyvern API';
COMMENT ON COLUMN skyvern_task_history.output IS 'Structured JSON output returned by the completed task';
COMMENT ON COLUMN skyvern_task_history.screenshots IS 'Array of screenshot URLs captured during task execution';
