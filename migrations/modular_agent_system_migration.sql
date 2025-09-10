-- Migration: Add Modular Agent System Support
-- Description: Adds fields to support predefined agents, immutability, and dynamic delegation
-- Date: 2025-09-09
-- Author: Modular Agent System

-- Add new fields to agents table for modular system support
ALTER TABLE agents ADD COLUMN IF NOT EXISTS is_predefined BOOLEAN DEFAULT false;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS is_immutable BOOLEAN DEFAULT false;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'database';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS delegation_tools JSONB DEFAULT '[]'::jsonb;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ DEFAULT NOW();

-- Add constraints for new fields
ALTER TABLE agents ADD CONSTRAINT IF NOT EXISTS valid_source_type 
  CHECK (source_type IN ('predefined', 'database', 'dynamic'));

-- Update indexes
CREATE INDEX IF NOT EXISTS idx_agents_is_predefined ON agents(is_predefined);
CREATE INDEX IF NOT EXISTS idx_agents_is_immutable ON agents(is_immutable);
CREATE INDEX IF NOT EXISTS idx_agents_source_type ON agents(source_type);
CREATE INDEX IF NOT EXISTS idx_agents_last_sync ON agents(last_sync_at);

-- GIN index for delegation tools
CREATE INDEX IF NOT EXISTS idx_agents_delegation_tools ON agents USING GIN (delegation_tools);

-- Comment on new fields
COMMENT ON COLUMN agents.is_predefined IS 'Whether this is a built-in system agent (Cleo, Toby, etc.)';
COMMENT ON COLUMN agents.is_immutable IS 'Whether this agent configuration can be modified by users';
COMMENT ON COLUMN agents.source_type IS 'Source of agent: predefined (built-in), database (user-created), dynamic (runtime-generated)';
COMMENT ON COLUMN agents.delegation_tools IS 'Array of delegation tool names available to this agent';
COMMENT ON COLUMN agents.last_sync_at IS 'Last time agent was synchronized with registry';

-- Function to mark predefined agents as immutable
CREATE OR REPLACE FUNCTION mark_predefined_agents_immutable()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE agents 
  SET is_immutable = true, 
      source_type = 'predefined',
      last_sync_at = NOW()
  WHERE is_predefined = true;
END;
$$;

-- Function to update delegation tools for an agent
CREATE OR REPLACE FUNCTION update_agent_delegation_tools(
  agent_id UUID,
  new_tools JSONB DEFAULT '[]'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE agents 
  SET delegation_tools = new_tools,
      last_sync_at = NOW()
  WHERE id = agent_id;
END;
$$;

-- Function to get sub-agents for a parent agent
CREATE OR REPLACE FUNCTION get_sub_agents_for_parent(
  parent_id UUID,
  requesting_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
  id UUID,
  name VARCHAR(100),
  description TEXT,
  tags JSONB,
  tools JSONB,
  delegation_tools JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.name,
    a.description,
    a.tags,
    a.tools,
    a.delegation_tools,
    a.created_at
  FROM agents a
  WHERE a.parent_agent_id = parent_id
    AND a.is_sub_agent = true
    AND a.is_active = true
    AND (a.user_id = requesting_user_id OR a.is_predefined = true);
END;
$$;

-- Function to get all agents for a user (predefined + user agents)
CREATE OR REPLACE FUNCTION get_user_agents(
  requesting_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
  id UUID,
  name VARCHAR(100),
  description TEXT,
  role VARCHAR(50),
  system_prompt TEXT,
  model VARCHAR(100),
  temperature DECIMAL(3,2),
  max_tokens INTEGER,
  color VARCHAR(7),
  icon VARCHAR(50),
  tags JSONB,
  tools JSONB,
  delegation_tools JSONB,
  is_predefined BOOLEAN,
  is_immutable BOOLEAN,
  is_sub_agent BOOLEAN,
  parent_agent_id UUID,
  source_type VARCHAR(20),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.name,
    a.description,
    a.role,
    a.system_prompt,
    a.model,
    a.temperature,
    a.max_tokens,
    a.color,
    a.icon,
    a.tags,
    a.tools,
    a.delegation_tools,
    a.is_predefined,
    a.is_immutable,
    a.is_sub_agent,
    a.parent_agent_id,
    a.source_type,
    a.created_at,
    a.updated_at
  FROM agents a
  WHERE (a.user_id = requesting_user_id OR a.is_predefined = true)
    AND a.is_active = true
  ORDER BY a.is_predefined DESC, a.priority ASC, a.name ASC;
END;
$$;

-- Function to sync agent with registry
CREATE OR REPLACE FUNCTION sync_agent_with_registry(
  agent_id UUID,
  sync_data JSONB DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE agents 
  SET last_sync_at = NOW()
  WHERE id = agent_id;
  
  -- Optionally update delegation tools if provided
  IF sync_data ? 'delegation_tools' THEN
    UPDATE agents 
    SET delegation_tools = sync_data->>'delegation_tools'
    WHERE id = agent_id;
  END IF;
END;
$$;

-- Update RLS policies to handle predefined agents
DROP POLICY IF EXISTS "agents_select_policy" ON agents;
CREATE POLICY "agents_select_policy" ON agents
    FOR SELECT
    USING (user_id = auth.uid() OR is_predefined = true);

-- Protect predefined agents from modification
DROP POLICY IF EXISTS "agents_update_policy" ON agents;
CREATE POLICY "agents_update_policy" ON agents
    FOR UPDATE
    USING (user_id = auth.uid() AND is_immutable = false)
    WITH CHECK (user_id = auth.uid() AND is_immutable = false);

DROP POLICY IF EXISTS "agents_delete_policy" ON agents;
CREATE POLICY "agents_delete_policy" ON agents
    FOR DELETE
    USING (user_id = auth.uid() AND is_predefined = false AND is_immutable = false);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION mark_predefined_agents_immutable() TO authenticated;
GRANT EXECUTE ON FUNCTION update_agent_delegation_tools(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_sub_agents_for_parent(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_agents(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_agent_with_registry(UUID, JSONB) TO authenticated;
