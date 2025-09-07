-- Agent Chat Threads & Messages Schema
-- This adds per-agent conversation threads and message persistence with RLS

-- Threads table: one thread per user x agent conversation
CREATE TABLE IF NOT EXISTS agent_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_key TEXT NOT NULL,           -- e.g., 'cleo-supervisor', 'emma-shopify'
  agent_name TEXT,                   -- display name snapshot
  title TEXT DEFAULT 'Conversation',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_threads_user ON agent_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_threads_agent ON agent_threads(agent_key);

CREATE OR REPLACE FUNCTION update_agent_threads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agent_threads_updated ON agent_threads;
CREATE TRIGGER trg_agent_threads_updated
  BEFORE UPDATE ON agent_threads
  FOR EACH ROW EXECUTE PROCEDURE update_agent_threads_updated_at();

ALTER TABLE agent_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_threads_user_select ON agent_threads
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY agent_threads_user_insert ON agent_threads
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY agent_threads_user_update ON agent_threads
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY agent_threads_user_delete ON agent_threads
  FOR DELETE USING (auth.uid() = user_id);

-- Messages table for agent threads
CREATE TABLE IF NOT EXISTS agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES agent_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  content TEXT,
  tool_calls JSONB,
  tool_results JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_messages_thread ON agent_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_user ON agent_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_created ON agent_messages(created_at);

ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_messages_user_select ON agent_messages
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY agent_messages_user_insert ON agent_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY agent_messages_user_update ON agent_messages
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY agent_messages_user_delete ON agent_messages
  FOR DELETE USING (auth.uid() = user_id);
