-- Dashboard: Agent Analytics Enhancement
-- Adds agent usage tracking and enhanced analytics for dashboard

-- 1. Create agent_usage_analytics table for dashboard metrics
CREATE TABLE IF NOT EXISTS public.agent_usage_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  usage_date DATE NOT NULL,
  
  -- Usage metrics
  execution_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  timeout_count INTEGER DEFAULT 0,
  
  -- Performance metrics
  avg_execution_time_ms INTEGER DEFAULT 0,
  total_execution_time_ms BIGINT DEFAULT 0,
  min_execution_time_ms INTEGER DEFAULT 0,
  max_execution_time_ms INTEGER DEFAULT 0,
  
  -- Delegation metrics
  delegations_sent INTEGER DEFAULT 0,
  delegations_received INTEGER DEFAULT 0,
  
  -- Token metrics (if available)
  total_input_tokens INTEGER DEFAULT 0,
  total_output_tokens INTEGER DEFAULT 0,
  
  -- Cost metrics
  estimated_cost_usd DECIMAL(10, 4) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, agent_id, usage_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_analytics_user_date 
  ON public.agent_usage_analytics(user_id, usage_date DESC);
CREATE INDEX IF NOT EXISTS idx_agent_analytics_agent 
  ON public.agent_usage_analytics(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_analytics_user_agent 
  ON public.agent_usage_analytics(user_id, agent_id);

-- RLS policies
ALTER TABLE public.agent_usage_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own agent analytics" 
  ON public.agent_usage_analytics
  FOR SELECT 
  USING (auth.uid() = user_id);

-- 2. Function to aggregate agent analytics daily
CREATE OR REPLACE FUNCTION public.aggregate_agent_analytics(p_user_id UUID, p_date DATE)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Aggregate from agent_executions for the given date
  INSERT INTO public.agent_usage_analytics (
    user_id,
    agent_id,
    usage_date,
    execution_count,
    success_count,
    error_count,
    timeout_count,
    avg_execution_time_ms,
    total_execution_time_ms,
    min_execution_time_ms,
    max_execution_time_ms,
    delegations_sent
  )
  SELECT
    user_id,
    COALESCE(agent_id, 'unknown') as agent_id,
    DATE(started_at) as usage_date,
    COUNT(*) as execution_count,
    COUNT(*) FILTER (WHERE status = 'completed') as success_count,
    COUNT(*) FILTER (WHERE status = 'failed') as error_count,
    COUNT(*) FILTER (WHERE status = 'timeout') as timeout_count,
    AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000)::INTEGER as avg_execution_time_ms,
    SUM(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000)::BIGINT as total_execution_time_ms,
    MIN(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000)::INTEGER as min_execution_time_ms,
    MAX(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000)::INTEGER as max_execution_time_ms,
    COUNT(*) FILTER (WHERE delegated_to IS NOT NULL) as delegations_sent
  FROM public.agent_executions
  WHERE user_id = p_user_id
    AND DATE(started_at) = p_date
    AND started_at IS NOT NULL
  GROUP BY user_id, agent_id, DATE(started_at)
  ON CONFLICT (user_id, agent_id, usage_date)
  DO UPDATE SET
    execution_count = EXCLUDED.execution_count,
    success_count = EXCLUDED.success_count,
    error_count = EXCLUDED.error_count,
    timeout_count = EXCLUDED.timeout_count,
    avg_execution_time_ms = EXCLUDED.avg_execution_time_ms,
    total_execution_time_ms = EXCLUDED.total_execution_time_ms,
    min_execution_time_ms = EXCLUDED.min_execution_time_ms,
    max_execution_time_ms = EXCLUDED.max_execution_time_ms,
    delegations_sent = EXCLUDED.delegations_sent,
    updated_at = NOW();

  -- Update delegations_received
  UPDATE public.agent_usage_analytics aua
  SET delegations_received = del.count,
      updated_at = NOW()
  FROM (
    SELECT 
      delegated_to as agent_id,
      COUNT(*) as count
    FROM public.agent_executions
    WHERE user_id = p_user_id
      AND DATE(started_at) = p_date
      AND delegated_to IS NOT NULL
    GROUP BY delegated_to
  ) del
  WHERE aua.user_id = p_user_id
    AND aua.agent_id = del.agent_id
    AND aua.usage_date = p_date;
END;
$$;

-- 3. Add success_rate column to tool_usage_analytics if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tool_usage_analytics' 
    AND column_name = 'success_rate'
  ) THEN
    ALTER TABLE public.tool_usage_analytics 
    ADD COLUMN success_rate DECIMAL(5, 2);
  END IF;
END $$;

-- 4. Create view for agent performance summary
CREATE OR REPLACE VIEW analytics.v_agent_performance_summary AS
SELECT
  user_id,
  agent_id,
  SUM(execution_count) as total_executions,
  SUM(success_count) as total_success,
  SUM(error_count) as total_errors,
  CASE 
    WHEN SUM(execution_count) > 0 
    THEN ROUND((SUM(success_count)::DECIMAL / SUM(execution_count)::DECIMAL * 100), 2)
    ELSE 0
  END as success_rate_pct,
  AVG(avg_execution_time_ms)::INTEGER as avg_time_ms,
  SUM(delegations_sent) as total_delegations_sent,
  SUM(delegations_received) as total_delegations_received,
  SUM(estimated_cost_usd) as total_cost_usd,
  MAX(usage_date) as last_used
FROM public.agent_usage_analytics
GROUP BY user_id, agent_id;

-- 5. Create materialized view for agent delegation flow
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.mv_agent_delegation_flow AS
SELECT
  e1.user_id,
  e1.agent_id as source_agent,
  e2.agent_id as target_agent,
  COUNT(*) as delegation_count,
  AVG(EXTRACT(EPOCH FROM (e2.completed_at - e2.started_at)) * 1000)::INTEGER as avg_target_time_ms
FROM public.agent_executions e1
JOIN public.agent_executions e2 ON e1.delegated_to = e2.id
WHERE e1.agent_id IS NOT NULL 
  AND e2.agent_id IS NOT NULL
GROUP BY e1.user_id, e1.agent_id, e2.agent_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_delegation_flow_unique
  ON analytics.mv_agent_delegation_flow (user_id, source_agent, target_agent);

-- 6. Function to refresh all analytics
CREATE OR REPLACE FUNCTION analytics.refresh_all_analytics_views()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Refresh tool usage
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_tool_usage_daily;
  EXCEPTION WHEN OTHERS THEN
    REFRESH MATERIALIZED VIEW analytics.mv_tool_usage_daily;
  END;

  -- Refresh delegations
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_delegations_daily;
  EXCEPTION WHEN OTHERS THEN
    REFRESH MATERIALIZED VIEW analytics.mv_delegations_daily;
  END;

  -- Refresh agent delegation flow
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_agent_delegation_flow;
  EXCEPTION WHEN OTHERS THEN
    REFRESH MATERIALIZED VIEW analytics.mv_agent_delegation_flow;
  END;
END;
$$;

-- 7. Update tool_usage_analytics success_rate automatically
CREATE OR REPLACE FUNCTION public.update_tool_success_rate()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.invocation_count > 0 THEN
    NEW.success_rate := ROUND((NEW.success_count::DECIMAL / NEW.invocation_count::DECIMAL * 100), 2);
  ELSE
    NEW.success_rate := 0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_tool_success_rate ON public.tool_usage_analytics;
CREATE TRIGGER trigger_update_tool_success_rate
  BEFORE INSERT OR UPDATE ON public.tool_usage_analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tool_success_rate();

-- 8. Grant permissions (if needed)
GRANT SELECT ON analytics.v_agent_performance_summary TO authenticated;
GRANT SELECT ON analytics.mv_agent_delegation_flow TO authenticated;

-- Comments
COMMENT ON TABLE public.agent_usage_analytics IS 'Daily aggregated metrics per agent for dashboard analytics';
COMMENT ON VIEW analytics.v_agent_performance_summary IS 'Summary of agent performance across all time periods';
COMMENT ON MATERIALIZED VIEW analytics.mv_agent_delegation_flow IS 'Agent-to-agent delegation patterns for flow visualization';
