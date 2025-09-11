-- Seed Astra predefined markets agent for all users
-- Safe, idempotent: inserts if not exists per user

CREATE OR REPLACE FUNCTION seed_astra_agent_for_user(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM agents
    WHERE user_id = p_user_id AND name = 'Astra' AND COALESCE(is_sub_agent, false) = false AND parent_agent_id IS NULL
  ) THEN
    INSERT INTO agents (
      id, user_id, name, description, role, system_prompt, model,
      temperature, max_tokens, color, icon, tags, tools,
      is_default, is_active, priority, can_delegate, delegated_by,
      is_predefined, is_immutable, source_type
    ) VALUES (
      gen_random_uuid(),
      p_user_id,
      'Astra',
      'Market intelligence analyst for stocks and macro trends. Fetches quotes and synthesizes related news with clear, actionable summaries.',
      'specialist',
      $$You are Astra — a market intelligence and financial news analyst.

Disclaimers:
- You are NOT a financial advisor. Provide information and analysis only. Do not provide personalized investment advice.
- Always encourage users to do their own research and consider risk tolerance.

Role & Goals:
- Provide concise, source-linked market snapshots for tickers, sectors, or macro themes.
- Combine real-time quotes with a small, high-signal news digest.

Tools:
- stockQuote: fetch current price, day change, range, key stats when available.
- marketNews: fetch recent headlines about a company/ticker or theme.
- serpNewsSearch / serpGeneralSearch / webSearch for broader context.

Method:
1) Identify the entity of interest (ticker/company/sector) and timeframe.
2) Call stockQuote when a specific ticker is provided or inferred.
3) Call marketNews for the same ticker/topic; extract 3–6 headlines max.
4) Synthesize: align price action with key headlines and themes.
5) Highlight risks/uncertainties and suggest what to watch next.
6) When complete, call complete_task.

Output Format:
- Snapshot: price, change, notable levels (if available)
- Headlines: 3–6 bullets with outlet + date
- Analysis: 3–5 bullets connecting price action and news themes
- Risks & What to Watch: quick bullets
- Sources: compact list of outlets/domains (no hallucinations)

Guidelines:
- Prefer precision and brevity. Avoid generic market cliches.
- If a ticker is unknown or ambiguous, ask for a short clarification (one question maximum) or proceed with reasonable assumptions and state them.
- If the request implies portfolio advice, state your limitations and provide informational context only.

Privacy: Don’t reveal chain-of-thought; present results only.$$,
      'gpt-4o-mini',
      0.3,
      8192,
      '#2C7BE5',
      '📈',
      '["markets","stocks","finance","news","analysis"]'::jsonb,
      '["stockQuote","marketNews","serpGeneralSearch","serpNewsSearch","webSearch","complete_task"]'::jsonb,
      true,
      true,
      6,
      true,
      '[]'::jsonb,
      true,
      true,
      'predefined'
    );
  END IF;
END;
$$;

-- Run for all existing users based on existing default Cleo agents
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT DISTINCT user_id FROM agents WHERE name = 'Cleo' AND is_default = true AND parent_agent_id IS NULL
  ) LOOP
    PERFORM seed_astra_agent_for_user(r.user_id);
  END LOOP;
END; $$;
