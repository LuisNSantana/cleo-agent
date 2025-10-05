-- ============================================================================
-- PASO 1: LIMPIAR TABLAS DE ANALYTICS (EMPEZAR DESDE 0)
-- ============================================================================

-- Limpiar datos existentes de analytics
TRUNCATE TABLE public.model_usage_analytics CASCADE;
TRUNCATE TABLE public.feature_usage_analytics CASCADE;
TRUNCATE TABLE public.tool_usage_analytics CASCADE;

-- Limpiar materialized views si existen (PostgreSQL no soporta IF EXISTS en REFRESH)
DO $$ 
BEGIN
  BEGIN
    REFRESH MATERIALIZED VIEW analytics.mv_tool_usage_daily;
  EXCEPTION WHEN undefined_table THEN
    NULL; -- Ignora si no existe
  END;
  
  BEGIN
    REFRESH MATERIALIZED VIEW analytics.mv_delegations_daily;
  EXCEPTION WHEN undefined_table THEN
    NULL; -- Ignora si no existe
  END;
END $$;

COMMENT ON TABLE public.model_usage_analytics IS 'Analytics limpiada - empezando desde 0';

-- ============================================================================
-- PASO 2: CREAR AGENT_USAGE_ANALYTICS TABLE
-- ============================================================================

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
  
  -- Token metrics
  total_input_tokens INTEGER DEFAULT 0,
  total_output_tokens INTEGER DEFAULT 0,
  
  -- Cost metrics
  estimated_cost_usd DECIMAL(10, 4) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, agent_id, usage_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_analytics_user_date 
  ON public.agent_usage_analytics(user_id, usage_date DESC);
CREATE INDEX IF NOT EXISTS idx_agent_analytics_agent 
  ON public.agent_usage_analytics(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_analytics_user_agent 
  ON public.agent_usage_analytics(user_id, agent_id);

-- RLS
ALTER TABLE public.agent_usage_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own agent analytics" ON public.agent_usage_analytics;
CREATE POLICY "Users can view own agent analytics" 
  ON public.agent_usage_analytics
  FOR SELECT 
  USING (auth.uid() = user_id);

-- ============================================================================
-- PASO 3: FUNCIÓN PARA AGREGAR ANALYTICS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.aggregate_agent_analytics(p_user_id UUID, p_date DATE)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.agent_usage_analytics (
    user_id, agent_id, usage_date,
    execution_count, success_count, error_count, timeout_count,
    avg_execution_time_ms, total_execution_time_ms,
    min_execution_time_ms, max_execution_time_ms,
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
END;
$$;

-- ============================================================================
-- PASO 4: AGREGAR SUCCESS_RATE A TOOL_USAGE_ANALYTICS
-- ============================================================================

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

-- Auto-calculate success_rate
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

-- ============================================================================
-- COMPLETADO
-- ============================================================================

SELECT 'Migration completada exitosamente! Analytics limpiadas y listas.' AS status;
