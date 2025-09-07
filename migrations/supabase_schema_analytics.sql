-- Cleo Agent - Comprehensive Analytics Schema (v1)
-- Date: 2025-08-16
-- Purpose: End-to-end analytics: models, features, tools, conversations, sessions

-- Prerequisites
-- Requires: pgcrypto or uuid-ossp for gen_random_uuid(); Supabase usually provides it

-- =========================
-- EXTENSIONS
-- =========================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================
-- EXISTING TABLE ENHANCEMENTS
-- =========================
-- messages
ALTER TABLE IF EXISTS messages ADD COLUMN IF NOT EXISTS response_time_ms INTEGER;
ALTER TABLE IF EXISTS messages ADD COLUMN IF NOT EXISTS input_tokens INTEGER;
ALTER TABLE IF EXISTS messages ADD COLUMN IF NOT EXISTS output_tokens INTEGER;
ALTER TABLE IF EXISTS messages ADD COLUMN IF NOT EXISTS tools_invoked TEXT[] DEFAULT '{}'::text[];
ALTER TABLE IF EXISTS messages ADD COLUMN IF NOT EXISTS personality_snapshot JSONB;

CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at);
CREATE INDEX IF NOT EXISTS idx_messages_user_model ON messages (user_id, model);

-- chats
ALTER TABLE IF EXISTS chats ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS chats ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS chats ADD COLUMN IF NOT EXISTS total_tokens INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS chats ADD COLUMN IF NOT EXISTS engagement_score NUMERIC(5,2) DEFAULT 0.00;

CREATE INDEX IF NOT EXISTS idx_chats_user_created ON chats (user_id, created_at);

-- users
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS total_session_time_minutes INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS favorite_features TEXT[] DEFAULT '{}'::text[];
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS streak_days INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS avg_daily_messages NUMERIC(7,2) DEFAULT 0.00;

-- =========================
-- ANALYTICS TABLES
-- =========================
CREATE TABLE IF NOT EXISTS model_usage_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  message_count INTEGER DEFAULT 0,
  total_input_tokens INTEGER DEFAULT 0,
  total_output_tokens INTEGER DEFAULT 0,
  total_cost_estimate NUMERIC(12,4) DEFAULT 0,
  average_response_time_ms INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  personality_type TEXT,
  tool_calls_count INTEGER DEFAULT 0,
  reasoning_requests INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, model_name, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_mua_date ON model_usage_analytics (usage_date);
CREATE INDEX IF NOT EXISTS idx_mua_user_date ON model_usage_analytics (user_id, usage_date);

CREATE TABLE IF NOT EXISTS feature_usage_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  usage_count INTEGER DEFAULT 0,
  total_time_spent_minutes INTEGER DEFAULT 0,
  success_rate NUMERIC(5,2) DEFAULT 0.00,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, feature_name, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_fua_user_date ON feature_usage_analytics (user_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_fua_feature_date ON feature_usage_analytics (feature_name, usage_date);

CREATE TABLE IF NOT EXISTS tool_usage_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invocation_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  avg_execution_time_ms INTEGER DEFAULT 0,
  total_execution_time_ms INTEGER DEFAULT 0,
  popular_parameters JSONB,
  error_types TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tool_name, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_tua_user_date ON tool_usage_analytics (user_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_tua_tool_date ON tool_usage_analytics (tool_name, usage_date);

CREATE TABLE IF NOT EXISTS user_session_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_end TIMESTAMPTZ,
  session_duration_minutes INTEGER,
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  models_used TEXT[] DEFAULT '{}'::text[],
  tools_invoked TEXT[] DEFAULT '{}'::text[],
  personality_used JSONB,
  canvas_interactions INTEGER DEFAULT 0,
  files_uploaded INTEGER DEFAULT 0,
  rag_queries INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usa_user_start ON user_session_analytics (user_id, session_start);

CREATE TABLE IF NOT EXISTS conversation_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_messages INTEGER DEFAULT 0,
  user_messages INTEGER DEFAULT 0,
  assistant_messages INTEGER DEFAULT 0,
  conversation_duration_minutes INTEGER DEFAULT 0,
  models_switched INTEGER DEFAULT 0,
  personality_changes INTEGER DEFAULT 0,
  tools_used TEXT[] DEFAULT '{}'::text[],
  avg_response_length INTEGER DEFAULT 0,
  complexity_score NUMERIC(5,2) DEFAULT 0.00,
  satisfaction_rating INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chat_id)
);

CREATE INDEX IF NOT EXISTS idx_ca_user_chat ON conversation_analytics (user_id, chat_id);

-- =========================
-- FUNCTIONS & TRIGGERS
-- =========================
-- chat metrics on message changes
CREATE OR REPLACE FUNCTION fn_update_chat_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE chats 
       SET message_count = COALESCE(message_count, 0) + 1,
           last_message_at = NEW.created_at,
           total_tokens = COALESCE(total_tokens, 0) + COALESCE(NEW.input_tokens, 0) + COALESCE(NEW.output_tokens, 0)
     WHERE id = NEW.chat_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE chats 
       SET message_count = GREATEST(COALESCE(message_count, 1) - 1, 0),
           total_tokens = GREATEST(COALESCE(total_tokens, 0) - (COALESCE(OLD.input_tokens, 0) + COALESCE(OLD.output_tokens, 0)), 0)
     WHERE id = OLD.chat_id;
  END IF;
  RETURN NULL;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_chat_metrics ON messages;
CREATE TRIGGER trg_update_chat_metrics
AFTER INSERT OR DELETE ON messages
FOR EACH ROW EXECUTE FUNCTION fn_update_chat_metrics();

-- user daily message stats
CREATE OR REPLACE FUNCTION fn_update_user_message_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.role = 'user' THEN
    UPDATE users 
       SET message_count = COALESCE(message_count, 0) + 1,
           last_active_at = NEW.created_at
     WHERE id = NEW.user_id;
  END IF;
  RETURN NULL;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_user_message_stats ON messages;
CREATE TRIGGER trg_update_user_message_stats
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION fn_update_user_message_stats();

-- model usage daily upsert
CREATE OR REPLACE FUNCTION fn_model_usage_upsert()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.role = 'assistant' AND NEW.model IS NOT NULL THEN
    INSERT INTO model_usage_analytics (user_id, model_name, usage_date, message_count, total_input_tokens, total_output_tokens, average_response_time_ms)
    VALUES (NEW.user_id, NEW.model, CURRENT_DATE, 1, COALESCE(NEW.input_tokens,0), COALESCE(NEW.output_tokens,0), COALESCE(NEW.response_time_ms,0))
    ON CONFLICT (user_id, model_name, usage_date) DO UPDATE
      SET message_count = model_usage_analytics.message_count + 1,
          total_input_tokens = model_usage_analytics.total_input_tokens + COALESCE(EXCLUDED.total_input_tokens,0),
          total_output_tokens = model_usage_analytics.total_output_tokens + COALESCE(EXCLUDED.total_output_tokens,0),
          average_response_time_ms = CASE
            WHEN model_usage_analytics.message_count <= 1 THEN COALESCE(EXCLUDED.average_response_time_ms,0)
            ELSE ((model_usage_analytics.average_response_time_ms * (model_usage_analytics.message_count - 1)) + COALESCE(EXCLUDED.average_response_time_ms,0)) / model_usage_analytics.message_count
          END,
          updated_at = NOW();
  END IF;
  RETURN NULL;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_model_usage_upsert ON messages;
CREATE TRIGGER trg_model_usage_upsert
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION fn_model_usage_upsert();

-- =========================
-- VIEWS (Security INVOKER - user-scoped)
-- =========================
CREATE OR REPLACE VIEW user_daily_summary AS
SELECT 
  u.id as user_id,
  u.display_name,
  u.email,
  DATE(m.created_at) as usage_date,
  COUNT(CASE WHEN m.role = 'user' THEN 1 END) as messages_sent,
  COUNT(CASE WHEN m.role = 'assistant' THEN 1 END) as messages_received,
  COUNT(DISTINCT c.id) as conversations,
  COUNT(DISTINCT m.model) as models_used,
  SUM(COALESCE(m.input_tokens, 0)) as total_input_tokens,
  SUM(COALESCE(m.output_tokens, 0)) as total_output_tokens,
  AVG(COALESCE(m.response_time_ms, 0)) as avg_response_time_ms
FROM users u
LEFT JOIN messages m ON u.id = m.user_id AND u.id = auth.uid()
LEFT JOIN chats c ON m.chat_id = c.id
WHERE u.id = auth.uid()
GROUP BY u.id, u.display_name, u.email, DATE(m.created_at);

CREATE OR REPLACE VIEW model_performance_summary AS
SELECT 
  model,
  COUNT(*) as total_messages,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(COALESCE(response_time_ms, 0)) as avg_response_time_ms,
  SUM(COALESCE(input_tokens, 0)) as total_input_tokens,
  SUM(COALESCE(output_tokens, 0)) as total_output_tokens,
  DATE_TRUNC('day', created_at) as usage_date
FROM messages 
WHERE role = 'assistant' AND model IS NOT NULL AND user_id = auth.uid()
GROUP BY model, DATE_TRUNC('day', created_at)
ORDER BY usage_date DESC, total_messages DESC;

CREATE OR REPLACE VIEW popular_features_summary AS
SELECT 
  feature_name,
  SUM(usage_count) as total_usage,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(success_rate) as avg_success_rate,
  SUM(total_time_spent_minutes) as total_time_minutes
FROM feature_usage_analytics
WHERE user_id = auth.uid()
GROUP BY feature_name
ORDER BY total_usage DESC;

-- =========================
-- RPC: fn_update_model_analytics (used by server code)
-- =========================
CREATE OR REPLACE FUNCTION fn_update_model_analytics(
  p_user_id UUID,
  p_model_name TEXT,
  p_input_tokens INTEGER,
  p_output_tokens INTEGER,
  p_response_time_ms INTEGER,
  p_success BOOLEAN DEFAULT TRUE,
  p_cost_usd NUMERIC DEFAULT 0
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO model_usage_analytics (
    user_id, model_name, usage_date, message_count,
    total_input_tokens, total_output_tokens,
    average_response_time_ms, successful_requests, failed_requests,
    total_cost_estimate, updated_at
  ) VALUES (
    p_user_id, p_model_name, CURRENT_DATE, 1,
    COALESCE(p_input_tokens, 0), COALESCE(p_output_tokens, 0),
    COALESCE(p_response_time_ms, 0),
    CASE WHEN p_success THEN 1 ELSE 0 END,
    CASE WHEN p_success THEN 0 ELSE 1 END,
    COALESCE(p_cost_usd, 0), NOW()
  )
  ON CONFLICT (user_id, model_name, usage_date) DO UPDATE
  SET message_count = model_usage_analytics.message_count + 1,
      total_input_tokens = model_usage_analytics.total_input_tokens + COALESCE(EXCLUDED.total_input_tokens, 0),
      total_output_tokens = model_usage_analytics.total_output_tokens + COALESCE(EXCLUDED.total_output_tokens, 0),
      average_response_time_ms = CASE
        WHEN model_usage_analytics.message_count <= 1 THEN COALESCE(EXCLUDED.average_response_time_ms, 0)
        ELSE ((model_usage_analytics.average_response_time_ms * (model_usage_analytics.message_count - 1)) + COALESCE(EXCLUDED.average_response_time_ms, 0)) / model_usage_analytics.message_count
      END,
      successful_requests = model_usage_analytics.successful_requests + CASE WHEN p_success THEN 1 ELSE 0 END,
      failed_requests = model_usage_analytics.failed_requests + CASE WHEN p_success THEN 0 ELSE 1 END,
      total_cost_estimate = model_usage_analytics.total_cost_estimate + COALESCE(p_cost_usd, 0),
      updated_at = NOW();
END;
$$;

-- Grants for RPC execution
DO $$ BEGIN
  GRANT EXECUTE ON FUNCTION public.fn_update_model_analytics(UUID, TEXT, INTEGER, INTEGER, INTEGER, BOOLEAN, NUMERIC) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.fn_update_model_analytics(UUID, TEXT, INTEGER, INTEGER, INTEGER, BOOLEAN, NUMERIC) TO service_role;
EXCEPTION WHEN OTHERS THEN
  -- Ignore if roles not present in local environments
  NULL;
END $$;

-- =========================
-- RLS POLICIES
-- =========================
ALTER TABLE model_usage_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_usage_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_usage_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_session_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_analytics ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- model
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'model_usage_analytics' AND policyname = 'model_own_select') THEN
    CREATE POLICY model_own_select ON model_usage_analytics FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'model_usage_analytics' AND policyname = 'model_own_ins') THEN
    CREATE POLICY model_own_ins ON model_usage_analytics FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'model_usage_analytics' AND policyname = 'model_own_upd') THEN
    CREATE POLICY model_own_upd ON model_usage_analytics FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  -- feature
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'feature_usage_analytics' AND policyname = 'feature_own_select') THEN
    CREATE POLICY feature_own_select ON feature_usage_analytics FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'feature_usage_analytics' AND policyname = 'feature_own_ins') THEN
    CREATE POLICY feature_own_ins ON feature_usage_analytics FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'feature_usage_analytics' AND policyname = 'feature_own_upd') THEN
    CREATE POLICY feature_own_upd ON feature_usage_analytics FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  -- tool
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tool_usage_analytics' AND policyname = 'tool_own_select') THEN
    CREATE POLICY tool_own_select ON tool_usage_analytics FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tool_usage_analytics' AND policyname = 'tool_own_ins') THEN
    CREATE POLICY tool_own_ins ON tool_usage_analytics FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tool_usage_analytics' AND policyname = 'tool_own_upd') THEN
    CREATE POLICY tool_own_upd ON tool_usage_analytics FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  -- user session
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_session_analytics' AND policyname = 'usa_own_select') THEN
    CREATE POLICY usa_own_select ON user_session_analytics FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_session_analytics' AND policyname = 'usa_own_ins') THEN
    CREATE POLICY usa_own_ins ON user_session_analytics FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_session_analytics' AND policyname = 'usa_own_upd') THEN
    CREATE POLICY usa_own_upd ON user_session_analytics FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  -- conversation
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'conversation_analytics' AND policyname = 'ca_own_select') THEN
    CREATE POLICY ca_own_select ON conversation_analytics FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'conversation_analytics' AND policyname = 'ca_own_ins') THEN
    CREATE POLICY ca_own_ins ON conversation_analytics FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'conversation_analytics' AND policyname = 'ca_own_upd') THEN
    CREATE POLICY ca_own_upd ON conversation_analytics FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- =========================
-- BACKFILL
-- =========================
-- Chats message_count, last_message_at, total_tokens
UPDATE chats c SET 
  message_count = sub.cnt,
  last_message_at = sub.last_at,
  total_tokens = sub.toks
FROM (
  SELECT chat_id, COUNT(*) cnt, MAX(created_at) last_at,
         COALESCE(SUM(COALESCE(input_tokens,0) + COALESCE(output_tokens,0)),0) toks
  FROM messages
  GROUP BY chat_id
) sub
WHERE c.id = sub.chat_id;

-- Users message_count quick backfill
UPDATE users u SET message_count = sub.cnt
FROM (
  SELECT user_id, COUNT(*) cnt
  FROM messages
  WHERE role = 'user'
  GROUP BY user_id
) sub
WHERE u.id = sub.user_id;

-- Success notice
DO $$ BEGIN
  RAISE NOTICE 'Cleo Analytics Schema v1 applied successfully';
END $$;
