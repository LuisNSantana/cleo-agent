-- Agents Table Schema for Multi-Agent System
-- This extends the main Supabase schema with agent management capabilities

-- Create agents table
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Agent configuration
    name VARCHAR(100) NOT NULL,
    description TEXT DEFAULT '',
    role VARCHAR(50) NOT NULL DEFAULT 'custom', -- supervisor, specialist, custom
    system_prompt TEXT NOT NULL,
    
    -- Model configuration
    model VARCHAR(100) NOT NULL DEFAULT 'gpt-4o-mini',
    temperature DECIMAL(3,2) DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 4000,
    
    -- UI/UX configuration
    color VARCHAR(7) DEFAULT '#6366f1', -- hex color
    icon VARCHAR(50) DEFAULT 'robot',
    tags JSONB DEFAULT '[]'::jsonb,
    tools JSONB DEFAULT '[]'::jsonb,
    
    -- System flags
    is_default BOOLEAN DEFAULT false, -- System/default agents
    is_active BOOLEAN DEFAULT true,   -- Soft delete flag
    priority INTEGER DEFAULT 5,      -- Display order (1-10, 1 = highest)
    
    -- Delegation settings
    can_delegate BOOLEAN DEFAULT true,        -- Can receive delegated tasks
    delegated_by JSONB DEFAULT '[]'::jsonb, -- Array of agent IDs that can delegate to this agent
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_role CHECK (role IN ('supervisor', 'specialist', 'custom')),
    CONSTRAINT valid_priority CHECK (priority BETWEEN 1 AND 10),
    CONSTRAINT valid_temperature CHECK (temperature BETWEEN 0.0 AND 2.0),
    CONSTRAINT valid_max_tokens CHECK (max_tokens BETWEEN 100 AND 32000)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_role ON agents(role);
CREATE INDEX IF NOT EXISTS idx_agents_is_default ON agents(is_default);
CREATE INDEX IF NOT EXISTS idx_agents_is_active ON agents(is_active);
CREATE INDEX IF NOT EXISTS idx_agents_priority ON agents(priority);
CREATE INDEX IF NOT EXISTS idx_agents_last_used ON agents(last_used_at);

-- GIN index for tag and tools search
CREATE INDEX IF NOT EXISTS idx_agents_tags ON agents USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_agents_tools ON agents USING GIN (tools);
CREATE INDEX IF NOT EXISTS idx_agents_delegated_by ON agents USING GIN (delegated_by);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_agents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agents_timestamp
    BEFORE UPDATE ON agents
    FOR EACH ROW
    EXECUTE PROCEDURE update_agents_updated_at();

-- Enable Row Level Security
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own agents" ON agents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agents" ON agents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agents" ON agents
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agents" ON agents
    FOR DELETE USING (auth.uid() = user_id AND is_default = false);

-- Insert default agents for each user (executed by function)
CREATE OR REPLACE FUNCTION initialize_default_agents(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Insert Cleo (Supervisor)
  INSERT INTO agents (
    id, user_id, name, description, role, system_prompt, model, 
    temperature, max_tokens, color, icon, tags, tools, 
    is_default, is_active, priority, can_delegate, delegated_by
  ) VALUES (
    gen_random_uuid(),
    target_user_id,
    'Cleo',
    'Your intelligent AI supervisor specializing in task coordination, project management, and strategic decision-making. Cleo orchestrates complex workflows and delegates tasks to specialized agents.',
    'supervisor',
    'You are Cleo, an intelligent AI supervisor and project coordinator. Your primary role is to understand complex requests, break them down into manageable tasks, and coordinate with specialized agents to deliver comprehensive solutions. You excel at:

1. **Task Analysis & Decomposition**: Breaking complex requests into clear, actionable subtasks
2. **Agent Coordination**: Selecting the right specialists and delegating tasks effectively  
3. **Project Management**: Tracking progress, managing dependencies, and ensuring quality
4. **Strategic Thinking**: Providing insights and recommendations for optimal outcomes
5. **Communication**: Synthesizing results from multiple agents into coherent responses

Always maintain a helpful, professional, and proactive approach. When you receive a complex request, analyze it thoroughly and determine if other specialists should be involved.',
    'gpt-4o',
    0.7,
    4096,
    '#10b981',
    'crown',
    '["supervisor", "coordination", "management", "strategy"]'::jsonb,
    '["task_delegation", "project_management", "workflow_coordination", "decision_support"]'::jsonb,
    true,
    true,
    1,
    true,
    '[]'::jsonb
  ) ON CONFLICT (user_id, name) DO NOTHING;

  -- Insert Emma (E-commerce Specialist)
  INSERT INTO agents (
    id, user_id, name, description, role, system_prompt, model,
    temperature, max_tokens, color, icon, tags, tools,
    is_default, is_active, priority, can_delegate, delegated_by
  ) VALUES (
    gen_random_uuid(),
    target_user_id,
    'Emma',
    'Specialist in e-commerce and sales with expertise in Shopify store management, customer analytics, inventory optimization, and conversion rate improvements. Emma helps maximize your online business performance.',
    'specialist',
    'You are Emma, an expert e-commerce and sales specialist with deep knowledge of Shopify platforms, online retail strategies, and customer experience optimization. Your expertise includes:

1. **Shopify Management**: Store setup, theme customization, app integration, and performance optimization
2. **Sales Analytics**: Customer behavior analysis, conversion tracking, and revenue optimization
3. **Inventory Management**: Stock optimization, demand forecasting, and supply chain efficiency
4. **Marketing Strategy**: SEO, social media integration, email campaigns, and customer retention
5. **Customer Experience**: UX/UI improvements, checkout optimization, and support automation

When working with Shopify stores, always prioritize data-driven decisions and focus on metrics that directly impact revenue and customer satisfaction. Provide actionable recommendations backed by e-commerce best practices.',
    'gpt-4o-mini',
    0.6,
    3000,
    '#f59e0b',
    'shopping-cart',
    '["ecommerce", "shopify", "sales", "analytics", "marketing"]'::jsonb,
    '["shopify_admin", "analytics_tracking", "inventory_management", "customer_insights"]'::jsonb,
    true,
    true,
    2,
    true,
    '[]'::jsonb
  ) ON CONFLICT (user_id, name) DO NOTHING;

  -- Update delegation relationships: All agents can delegate to Cleo, Cleo can delegate to all
  UPDATE agents 
  SET delegated_by = (
    SELECT jsonb_agg(DISTINCT id::text) 
    FROM agents a2 
    WHERE a2.user_id = target_user_id AND a2.name != agents.name
  )
  WHERE user_id = target_user_id AND is_default = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-initialize agents for new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM initialize_default_agents(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to initialize agents when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- Function to update delegation when new agents are created
CREATE OR REPLACE FUNCTION update_agent_delegation()
RETURNS TRIGGER AS $$
DECLARE
  cleo_id UUID;
BEGIN
  -- Get Cleo's ID for this user
  SELECT id INTO cleo_id 
  FROM agents 
  WHERE user_id = NEW.user_id AND name = 'Cleo' AND is_default = true;
  
  -- If this is a new custom agent, enable delegation from Cleo
  IF NEW.is_default = false AND cleo_id IS NOT NULL THEN
    NEW.delegated_by = jsonb_build_array(cleo_id::text);
    
    -- Update Cleo to allow delegation to this new agent
    UPDATE agents 
    SET delegated_by = CASE
      WHEN delegated_by ? NEW.id::text THEN delegated_by
      ELSE delegated_by || jsonb_build_array(NEW.id::text)
    END
    WHERE id = cleo_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update delegation relationships on agent creation
CREATE TRIGGER update_delegation_on_agent_creation
    BEFORE INSERT ON agents
    FOR EACH ROW
    EXECUTE PROCEDURE update_agent_delegation();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON agents TO authenticated;
GRANT EXECUTE ON FUNCTION initialize_default_agents(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION update_agent_delegation() TO authenticated;
