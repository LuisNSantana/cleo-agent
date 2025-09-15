-- Agent Aliases Registry (Global)
-- Provides a case-insensitive alias → canonical_key mapping for agents/sub-agents

-- Enable citext for case-insensitive alias handling
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS agent_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alias CITEXT NOT NULL,
  canonical_key TEXT NOT NULL, -- e.g., 'cleo-supervisor', 'ami-creative', 'notion-agent'
  kind TEXT NOT NULL DEFAULT 'agent', -- 'agent' | 'subagent' | 'runtime'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agent_aliases_kind_check CHECK (kind IN ('agent','subagent','runtime'))
);

-- Ensure alias uniqueness globally (case-insensitive due to citext)
CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_aliases_alias ON agent_aliases(alias);

-- Fast lookup by canonical key
CREATE INDEX IF NOT EXISTS idx_agent_aliases_canonical ON agent_aliases(canonical_key);

-- Trigger to maintain updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_agent_aliases_updated_at ON agent_aliases;
CREATE TRIGGER tr_agent_aliases_updated_at
  BEFORE UPDATE ON agent_aliases
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Seed common aliases for predefined agents and sub-agents
INSERT INTO agent_aliases (alias, canonical_key, kind) VALUES
  -- Cleo (Supervisor)
  ('cleo', 'cleo-supervisor', 'agent'),
  ('supervisor', 'cleo-supervisor', 'agent'),
  ('cleo-supervisor', 'cleo-supervisor', 'agent'),

  -- Ami (Creative/EA) + legacy
  ('ami', 'ami-creative', 'agent'),
  ('ami-assistant', 'ami-creative', 'agent'),
  ('ami-creative', 'ami-creative', 'agent'),

  -- Peter (Google Workspace)
  ('peter', 'peter-google', 'agent'),
  ('peter-workspace', 'peter-google', 'agent'),
  ('peter-google', 'peter-google', 'agent'),

  -- Toby (Technical)
  ('toby', 'toby-technical', 'agent'),
  ('toby-technical', 'toby-technical', 'agent'),

  -- Emma (E-commerce)
  ('emma', 'emma-ecommerce', 'agent'),
  ('emma-ecommerce', 'emma-ecommerce', 'agent'),

  -- Apu (Research)
  ('apu', 'apu-research', 'agent'),
  ('apu-research', 'apu-research', 'agent'),

  -- Wex (Automation)
  ('wex', 'wex-automation', 'agent'),
  ('wex-automation', 'wex-automation', 'agent'),

  -- Nora (Social)
  ('nora', 'nora-community', 'agent'),
  ('nora-community', 'nora-community', 'agent'),

  -- Sub-agents / Integrations
  ('astra', 'astra-email', 'subagent'),
  ('astra-email', 'astra-email', 'subagent'),
  ('notion', 'notion-agent', 'subagent'),
  ('notion-agent', 'notion-agent', 'subagent')
ON CONFLICT (alias) DO NOTHING;

-- RLS optional (global registry - typically readable by all)
ALTER TABLE agent_aliases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS agent_aliases_read_policy ON agent_aliases;
CREATE POLICY agent_aliases_read_policy ON agent_aliases
  FOR SELECT USING (true);

-- Done
