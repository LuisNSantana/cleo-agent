-- =========================================
-- SUB-AGENTS MIGRATION SCRIPT - SAFE VERSION
-- =========================================
-- This migration creates the necessary functions for the Sub-Agent Management System
-- using the unified agents table (no separate sub_agents table needed)
-- This version prevents RLS recursion issues

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================
-- 1. UTILITY FUNCTIONS FOR SUB-AGENTS
-- =========================================

-- Function to get sub-agents for a specific parent agent (SAFE VERSION)
CREATE OR REPLACE FUNCTION get_sub_agents_for_parent(parent_id UUID, requesting_user_id UUID)
RETURNS TABLE (
    id UUID,
    name VARCHAR(100),
    description TEXT,
    parent_agent_id UUID,
    is_sub_agent BOOLEAN,
    system_prompt TEXT,
    model VARCHAR(100),
    temperature DECIMAL(3,2),
    max_tokens INTEGER,
    color VARCHAR(7),
    icon VARCHAR(50),
    tags JSONB,
    tools JSONB,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.name,
        a.description,
        a.parent_agent_id,
        a.is_sub_agent,
        a.system_prompt,
        a.model,
        a.temperature,
        a.max_tokens,
        a.color,
        a.icon,
        a.tags,
        a.tools,
        a.is_active,
        a.created_at,
        a.updated_at
    FROM agents a
    WHERE a.parent_agent_id = parent_id 
      AND a.user_id = requesting_user_id
      AND a.is_sub_agent = true
      AND a.is_active = true
    ORDER BY a.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get statistics for sub-agents (SAFE VERSION)
CREATE OR REPLACE FUNCTION get_sub_agent_stats(requesting_user_id UUID)
RETURNS TABLE (
    total_sub_agents BIGINT,
    active_sub_agents BIGINT,
    parent_agents_with_subs BIGINT,
    most_recent_creation TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) FILTER (WHERE is_sub_agent = true) as total_sub_agents,
        COUNT(*) FILTER (WHERE is_sub_agent = true AND is_active = true) as active_sub_agents,
        COUNT(DISTINCT parent_agent_id) FILTER (WHERE is_sub_agent = true AND parent_agent_id IS NOT NULL) as parent_agents_with_subs,
        MAX(created_at) FILTER (WHERE is_sub_agent = true) as most_recent_creation
    FROM agents
    WHERE user_id = requesting_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate delegation tool name uniqueness (SAFE VERSION)
CREATE OR REPLACE FUNCTION generate_unique_delegation_tool_name(base_name VARCHAR(255))
RETURNS VARCHAR(255) AS $$
DECLARE
    tool_name VARCHAR(255);
    counter INTEGER := 1;
    base_clean VARCHAR(255);
BEGIN
    -- Clean and format the base name
    base_clean := lower(regexp_replace(base_name, '[^a-zA-Z0-9_]', '_', 'g'));
    base_clean := regexp_replace(base_clean, '_+', '_', 'g');
    base_clean := trim(both '_' from base_clean);
    
    -- Ensure minimum length
    IF length(base_clean) < 2 THEN
        base_clean := 'agent';
    END IF;
    
    -- Start with the base name
    tool_name := 'delegate_to_' || base_clean;
    
    -- Check if it exists and increment until we find a unique one
    -- Using a limit to prevent infinite loops
    WHILE EXISTS (
        SELECT 1 FROM agents 
        WHERE tools::text LIKE '%' || tool_name || '%'
    ) AND counter <= 100 LOOP
        counter := counter + 1;
        tool_name := 'delegate_to_' || base_clean || '_' || counter;
    END LOOP;
    
    RETURN tool_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to safely create a sub-agent (SAFE VERSION)
CREATE OR REPLACE FUNCTION create_sub_agent(
    p_user_id UUID,
    p_parent_agent_id UUID,
    p_name VARCHAR(100),
    p_description TEXT,
    p_system_prompt TEXT,
    p_model VARCHAR(100) DEFAULT 'gpt-4o-mini',
    p_temperature DECIMAL(3,2) DEFAULT 0.7,
    p_max_tokens INTEGER DEFAULT 3000,
    p_color VARCHAR(7) DEFAULT '#6366f1',
    p_icon VARCHAR(50) DEFAULT 'robot',
    p_tags JSONB DEFAULT '[]'::jsonb,
    p_tools JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID AS $$
DECLARE
    new_agent_id UUID;
    parent_exists BOOLEAN := false;
    delegation_tool_name VARCHAR(255);
BEGIN
    -- Validate that parent agent exists and belongs to user
    SELECT EXISTS(
        SELECT 1 FROM agents 
        WHERE id = p_parent_agent_id 
        AND user_id = p_user_id 
        AND is_sub_agent = false
    ) INTO parent_exists;
    
    IF NOT parent_exists THEN
        RAISE EXCEPTION 'Parent agent not found or does not belong to user';
    END IF;
    
    -- Generate unique delegation tool name
    delegation_tool_name := generate_unique_delegation_tool_name(p_name);
    
    -- Insert the sub-agent
    INSERT INTO agents (
        user_id,
        parent_agent_id,
        name,
        description,
        role,
        system_prompt,
        model,
        temperature,
        max_tokens,
        color,
        icon,
        tags,
        tools,
        is_default,
        is_sub_agent,
        is_active,
        priority,
        can_delegate,
        delegated_by
    ) VALUES (
        p_user_id,
        p_parent_agent_id,
        p_name,
        p_description,
        'specialist',
        p_system_prompt,
        p_model,
        p_temperature,
        p_max_tokens,
        p_color,
        p_icon,
        p_tags,
        p_tools,
        false,
        true,
        true,
        5,
        false,
        jsonb_build_array(p_parent_agent_id::text)
    ) RETURNING id INTO new_agent_id;
    
    -- Update parent agent to include delegation tool for new sub-agent
    UPDATE agents 
    SET tools = COALESCE(tools, '[]'::jsonb) || jsonb_build_object(
        'name', delegation_tool_name,
        'type', 'delegation',
        'target_agent_id', new_agent_id::text,
        'description', 'Delegate tasks to ' || p_name
    )
    WHERE id = p_parent_agent_id;
    
    RETURN new_agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to safely delete a sub-agent (SAFE VERSION)
CREATE OR REPLACE FUNCTION delete_sub_agent(p_agent_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    parent_id UUID;
    agent_name VARCHAR(100);
    tool_pattern TEXT;
BEGIN
    -- Get sub-agent details
    SELECT parent_agent_id, name 
    INTO parent_id, agent_name
    FROM agents 
    WHERE id = p_agent_id 
    AND user_id = p_user_id 
    AND is_sub_agent = true;
    
    IF parent_id IS NULL THEN
        RETURN false; -- Sub-agent not found or doesn't belong to user
    END IF;
    
    -- Remove delegation tool from parent agent
    tool_pattern := '%"target_agent_id":"' || p_agent_id::text || '"%';
    
    UPDATE agents 
    SET tools = (
        SELECT jsonb_agg(tool)
        FROM jsonb_array_elements(tools) AS tool
        WHERE NOT (tool::text LIKE tool_pattern)
    )
    WHERE id = parent_id;
    
    -- Delete the sub-agent
    DELETE FROM agents 
    WHERE id = p_agent_id 
    AND user_id = p_user_id 
    AND is_sub_agent = true;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================
-- 2. GRANTS AND PERMISSIONS
-- =========================================

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_sub_agents_for_parent(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_sub_agent_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_unique_delegation_tool_name(VARCHAR(255)) TO authenticated;
GRANT EXECUTE ON FUNCTION create_sub_agent(UUID, UUID, VARCHAR(100), TEXT, TEXT, VARCHAR(100), DECIMAL(3,2), INTEGER, VARCHAR(7), VARCHAR(50), JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_sub_agent(UUID, UUID) TO authenticated;

-- Grant permissions to service role
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- =========================================
-- 3. COMMENTS FOR MAINTENANCE
-- =========================================

COMMENT ON FUNCTION get_sub_agents_for_parent IS 'Safely retrieve sub-agents for a parent agent without causing RLS recursion';
COMMENT ON FUNCTION get_sub_agent_stats IS 'Get statistics about sub-agents for a user';
COMMENT ON FUNCTION generate_unique_delegation_tool_name IS 'Generate unique delegation tool names for sub-agents';
COMMENT ON FUNCTION create_sub_agent IS 'Safely create a new sub-agent with proper delegation setup';
COMMENT ON FUNCTION delete_sub_agent IS 'Safely delete a sub-agent and clean up delegation tools';

-- =========================================
-- MIGRATION COMPLETE
-- =========================================

-- Verify the migration
DO $$
BEGIN
    -- Check if functions exist
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_sub_agents_for_parent') THEN
        RAISE NOTICE 'SUCCESS: Sub-agent functions created successfully';
    ELSE
        RAISE EXCEPTION 'ERROR: Sub-agent functions were not created';
    END IF;
    
    RAISE NOTICE 'Sub-agents migration completed successfully!';
    RAISE NOTICE 'You can now use the Sub-Agent Management System with the unified agents table.';
    RAISE NOTICE 'All functions are designed to prevent RLS recursion issues.';
END $$;
