-- Agents Table Schema for Multi-Agent System - SAFE VERSION
-- This is the corrected version that prevents infinite recursion in RLS policies
-- Use this instead of supabase_schema_agents.sql

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
    
    -- Sub-agent support
    is_sub_agent BOOLEAN DEFAULT false,
    parent_agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_role CHECK (role IN ('supervisor', 'specialist', 'custom')),
    CONSTRAINT valid_priority CHECK (priority BETWEEN 1 AND 10),
    CONSTRAINT valid_temperature CHECK (temperature BETWEEN 0.0 AND 2.0),
    CONSTRAINT valid_max_tokens CHECK (max_tokens BETWEEN 100 AND 32000),
    CONSTRAINT no_self_reference CHECK (id != parent_agent_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_role ON agents(role);
CREATE INDEX IF NOT EXISTS idx_agents_is_default ON agents(is_default);
CREATE INDEX IF NOT EXISTS idx_agents_is_active ON agents(is_active);
CREATE INDEX IF NOT EXISTS idx_agents_priority ON agents(priority);
CREATE INDEX IF NOT EXISTS idx_agents_last_used ON agents(last_used_at);
CREATE INDEX IF NOT EXISTS idx_agents_parent ON agents(parent_agent_id);
CREATE INDEX IF NOT EXISTS idx_agents_is_sub_agent ON agents(is_sub_agent);

-- GIN index for tag and tools search
CREATE INDEX IF NOT EXISTS idx_agents_tags ON agents USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_agents_tools ON agents USING GIN (tools);
CREATE INDEX IF NOT EXISTS idx_agents_delegated_by ON agents USING GIN (delegated_by);

-- Safe updated_at trigger (doesn't cause recursion)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- SIMPLIFIED RLS Policies (no subconsultas that cause recursion)
CREATE POLICY "agents_select_policy" ON agents
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "agents_insert_policy" ON agents
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "agents_update_policy" ON agents
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "agents_delete_policy" ON agents
    FOR DELETE
    USING (user_id = auth.uid() AND is_default = false);

-- Safe delegation setup function (no queries during triggers)
CREATE OR REPLACE FUNCTION safe_setup_agent_delegation(agent_id uuid, user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cleo_id UUID;
  agent_exists BOOLEAN := false;
BEGIN
  -- Verificar que el agente existe usando un enfoque que no cause recursión
  SELECT EXISTS(SELECT 1 FROM agents WHERE id = agent_id AND agents.user_id = safe_setup_agent_delegation.user_id) 
  INTO agent_exists;
  
  IF NOT agent_exists THEN
    RETURN; -- Si el agente no existe, salir silenciosamente
  END IF;
  
  -- Usar una consulta más específica para encontrar Cleo
  -- Usando LIMIT para evitar problemas de rendimiento
  SELECT id INTO cleo_id 
  FROM agents 
  WHERE agents.user_id = safe_setup_agent_delegation.user_id 
    AND name = 'Cleo' 
    AND is_default = true
  LIMIT 1;
  
  -- Solo proceder si encontramos Cleo y es diferente del agente actual
  IF cleo_id IS NOT NULL AND cleo_id != agent_id THEN
    -- Configurar delegación del nuevo agente (puede ser delegado por Cleo)
    BEGIN
      UPDATE agents 
      SET delegated_by = COALESCE(delegated_by, '[]'::jsonb) || jsonb_build_array(cleo_id::text)
      WHERE id = agent_id 
        AND NOT (COALESCE(delegated_by, '[]'::jsonb) ? cleo_id::text);
    EXCEPTION WHEN OTHERS THEN
      -- Si hay un error, no fallar la creación del agente
      NULL;
    END;
    
    -- Configurar que Cleo puede delegar al nuevo agente
    BEGIN
      UPDATE agents 
      SET delegated_by = COALESCE(delegated_by, '[]'::jsonb) || jsonb_build_array(agent_id::text)
      WHERE id = cleo_id 
        AND NOT (COALESCE(delegated_by, '[]'::jsonb) ? agent_id::text);
    EXCEPTION WHEN OTHERS THEN
      -- Si hay un error, no fallar la creación del agente
      NULL;
    END;
  END IF;
END;
$$;

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
    'Agente principal emocional que coordina y delega tareas a sub-agentes especializados',
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
  ) ON CONFLICT DO NOTHING;

  -- Insert Emma (E-commerce Specialist)
  INSERT INTO agents (
    id, user_id, name, description, role, system_prompt, model,
    temperature, max_tokens, color, icon, tags, tools,
    is_default, is_active, priority, can_delegate, delegated_by
  ) VALUES (
    gen_random_uuid(),
    target_user_id,
    'Emma',
    'Specialist in e-commerce and sales with expertise in Shopify store management, customer analytics, inventory optimization, and conversion rate improvements.',
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
  ) ON CONFLICT DO NOTHING;

  -- Insert Peter (Logic & Math Specialist)
  INSERT INTO agents (
    id, user_id, name, description, role, system_prompt, model,
    temperature, max_tokens, color, icon, tags, tools,
    is_default, is_active, priority, can_delegate, delegated_by
  ) VALUES (
    gen_random_uuid(),
    target_user_id,
    'Peter',
    'Especialista en lógica, matemáticas y resolución estructurada de problemas',
    'specialist',
    'You are Peter, a logic and mathematics specialist focused on structured problem solving, analytical thinking, and computational reasoning. Your expertise includes:

1. **Mathematical Analysis**: Complex calculations, statistical analysis, and mathematical modeling
2. **Logic & Reasoning**: Formal logic, proof systems, and logical argumentation
3. **Problem Decomposition**: Breaking complex problems into manageable components
4. **Algorithm Design**: Developing step-by-step solutions and optimization strategies
5. **Data Analysis**: Pattern recognition, trend analysis, and quantitative insights

Always approach problems methodically, show your work clearly, and provide logical explanations for your conclusions.',
    'gpt-4o-mini',
    0.3,
    3000,
    '#3b82f6',
    'calculator',
    '["mathematics", "logic", "analysis", "problem-solving"]'::jsonb,
    '["mathematical_computation", "logical_reasoning", "data_analysis"]'::jsonb,
    true,
    true,
    3,
    true,
    '[]'::jsonb
  ) ON CONFLICT DO NOTHING;

  -- Insert Toby (Research & Data Specialist)
  INSERT INTO agents (
    id, user_id, name, description, role, system_prompt, model,
    temperature, max_tokens, color, icon, tags, tools,
    is_default, is_active, priority, can_delegate, delegated_by
  ) VALUES (
    gen_random_uuid(),
    target_user_id,
    'Toby',
    'Especialista en análisis de datos, investigación técnica y procesamiento de información',
    'specialist',
    'You are Toby, a research and data analysis specialist with expertise in information gathering, technical research, and data processing. Your skills include:

1. **Research Methods**: Comprehensive information gathering, source evaluation, and fact verification
2. **Data Analysis**: Statistical analysis, trend identification, and insight extraction
3. **Technical Investigation**: Deep-dive research into technical topics and emerging technologies
4. **Information Synthesis**: Combining multiple sources into coherent, actionable intelligence
5. **Documentation**: Creating clear, structured reports and research summaries

Always prioritize accuracy, cite reliable sources, and provide comprehensive analysis with actionable recommendations.',
    'gpt-4o-mini',
    0.4,
    4000,
    '#8b5cf6',
    'search',
    '["research", "data-analysis", "investigation", "technical"]'::jsonb,
    '["web_search", "data_processing", "research_tools", "analysis"]'::jsonb,
    true,
    true,
    4,
    true,
    '[]'::jsonb
  ) ON CONFLICT DO NOTHING;

  -- Insert Ami (Creative & Design Specialist)
  INSERT INTO agents (
    id, user_id, name, description, role, system_prompt, model,
    temperature, max_tokens, color, icon, tags, tools,
    is_default, is_active, priority, can_delegate, delegated_by
  ) VALUES (
    gen_random_uuid(),
    target_user_id,
    'Ami',
    'Especialista en creatividad, generación de contenido y diseño',
    'specialist',
    'You are Ami, a creative specialist focused on content generation, design thinking, and innovative solutions. Your expertise includes:

1. **Content Creation**: Writing, storytelling, and creative communication
2. **Design Thinking**: User-centered design, visual aesthetics, and creative problem solving
3. **Innovation**: Brainstorming, ideation, and out-of-the-box thinking
4. **Brand Development**: Brand voice, messaging, and creative strategy
5. **Visual Concepts**: UI/UX ideas, color schemes, and design recommendations

Always bring creativity and fresh perspectives to every task while maintaining practical applicability.',
    'gpt-4o-mini',
    0.8,
    3500,
    '#ec4899',
    'palette',
    '["creativity", "design", "content", "innovation"]'::jsonb,
    '["content_generation", "design_tools", "creative_thinking"]'::jsonb,
    true,
    true,
    5,
    true,
    '[]'::jsonb
  ) ON CONFLICT DO NOTHING;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-initialize agents for new users (SAFE VERSION)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Use a safe approach that doesn't cause recursion
  PERFORM initialize_default_agents(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to initialize agents when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON agents TO authenticated;
GRANT EXECUTE ON FUNCTION initialize_default_agents(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION safe_setup_agent_delegation(UUID, UUID) TO authenticated;

-- Comments for maintenance
COMMENT ON TABLE agents IS 'Multi-agent system table with safe RLS policies to prevent infinite recursion';
COMMENT ON FUNCTION safe_setup_agent_delegation IS 'Safe delegation setup that prevents RLS recursion issues';
COMMENT ON POLICY agents_select_policy ON agents IS 'Simple RLS policy without subconsultas to prevent recursion';
