-- Orchestrator Global Chat + Pipeline/Chips + Analytics setup
-- Safe/idempotent DDL for fresh clones

-- 1) Core performance indexes
CREATE INDEX IF NOT EXISTS idx_messages_parts_gin ON public.messages USING GIN (parts);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id_created_at ON public.messages (chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_executions_user_chat ON public.agent_executions (user_id, chat_id);
CREATE INDEX IF NOT EXISTS idx_agent_execution_steps_exec_num ON public.agent_execution_steps (execution_id, step_number);

-- 2) Analytics schema and objects
CREATE SCHEMA IF NOT EXISTS analytics;

-- View: execution timeline (joins executions + steps)
CREATE OR REPLACE VIEW analytics.v_agent_execution_timeline AS
SELECT
  s.execution_id,
  e.user_id,
  e.chat_id,
  e.agent_id,
  e.delegated_to,
  e.status AS execution_status,
  e.started_at,
  e.completed_at,
  s.id AS step_id,
  s.step_number,
  s.step_type,
  s.duration_ms,
  s.success,
  s.error_details,
  s.step_data,
  s."timestamp" AS step_timestamp
FROM public.agent_execution_steps s
JOIN public.agent_executions e ON e.id = s.execution_id;

-- MV: tool usage by day
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.mv_tool_usage_daily AS
SELECT
  date_trunc('day', m.created_at) AS day,
  m.user_id,
  m.chat_id,
  tool AS tool_name,
  count(*) AS uses
FROM public.messages m
JOIN LATERAL unnest(m.tools_invoked) AS tool ON TRUE
GROUP BY 1,2,3,4;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_tool_usage_daily_unique
  ON analytics.mv_tool_usage_daily (day, user_id, chat_id, tool_name);

-- MV: delegations by day
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.mv_delegations_daily AS
SELECT
  date_trunc('day', e.started_at) AS day,
  e.user_id,
  e.chat_id,
  e.delegated_to AS agent_id,
  count(*) AS delegations
FROM public.agent_executions e
WHERE e.delegated_to IS NOT NULL
GROUP BY 1,2,3,4;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_delegations_daily_unique
  ON analytics.mv_delegations_daily (day, user_id, chat_id, agent_id);

-- Refresh function
CREATE OR REPLACE FUNCTION analytics.refresh_analytics_materialized_views()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_tool_usage_daily;
  EXCEPTION WHEN OTHERS THEN
    REFRESH MATERIALIZED VIEW analytics.mv_tool_usage_daily;
  END;

  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_delegations_daily;
  EXCEPTION WHEN OTHERS THEN
    REFRESH MATERIALIZED VIEW analytics.mv_delegations_daily;
  END;
END;
$$;
