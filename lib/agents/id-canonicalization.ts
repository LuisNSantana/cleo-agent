/**
 * Agent ID canonicalization and display metadata
 *
 * Provides a single source of truth for mapping legacy/alias IDs to
 * canonical IDs, and for resolving human-friendly display names.
 */

// Map legacy or alias IDs to canonical IDs used across the system
const AGENT_ID_ALIASES: Record<string, string> = {
  // Primary specialists
  'ami-assistant': 'ami-creative',
  'peter-workspace': 'peter-financial',
  'peter-google': 'peter-financial',
  'peter-advisor': 'peter-financial',
  'peter-finance': 'peter-financial',
  'peter_financial': 'peter-financial', // ✅ FIX: Dynamic tool name conversion
  'toby': 'toby-technical',
  'toby_technical': 'toby-technical', // ✅ FIX: Dynamic tool name conversion
  'peter': 'peter-financial',
  'ami': 'ami-creative',
  'ami_creative': 'ami-creative', // ✅ FIX: Dynamic tool name conversion
  'apu': 'apu-support',
  'apu_support': 'apu-support', // ✅ FIX: Dynamic tool name conversion
  // Legacy DB canonical that drifted from code; normalize to current canonical
  'apu-research': 'apu-support',
  'nora': 'nora-medical', // ✅ FIX: Was nora-community, should be nora-medical
  'nora-community': 'nora-medical', // ✅ FIX: Legacy alias
  'astra': 'astra-email',
  'astra_email': 'astra-email', // ✅ FIX: Dynamic tool name conversion
  'notion': 'notion-agent',
  'notion_agent': 'notion-agent', // ✅ FIX: Dynamic tool name conversion
  'wex': 'wex-intelligence',
  'wex_intelligence': 'wex-intelligence', // ✅ FIX: Dynamic tool name conversion
  'iris': 'iris-insights', // ✅ FIX: Add Iris alias
  'iris_insights': 'iris-insights', // ✅ FIX: Dynamic tool name conversion
  'jenn': 'jenn-community', // ✅ FIX: Add Jenn alias
  'jenn_community': 'jenn-community', // ✅ FIX: Dynamic tool name conversion
  'emma_ecommerce': 'emma-ecommerce', // ✅ FIX: Dynamic tool name conversion
  'nora_medical': 'nora-medical', // ✅ FIX: Dynamic tool name conversion
  'cleo_supervisor': 'cleo-supervisor', // ✅ FIX: Dynamic tool name conversion
}

export function canonicalizeAgentId(id: string): string {
  return AGENT_ID_ALIASES[id] || id
}

// Friendly display names for known agent IDs (canonical preferred)
const AGENT_DISPLAY_NAMES: Record<string, string> = {
  // Main agents
  'cleo-supervisor': 'Kylio',
  'toby-technical': 'Toby',
  'ami-creative': 'Ami',
  'peter-financial': 'Peter',
  'emma-ecommerce': 'Emma',
  'apu-support': 'Apu',
  'wex-intelligence': 'Wex',
  'nora-medical': 'Nora', // ✅ FIX: Corrected from nora-community
  'jenn-community': 'Jenn', // ✅ FIX: Added Jenn
  'iris-insights': 'Iris', // ✅ FIX: Added Iris
  // Sub-agents
  'astra-email': 'Astra',
  'notion-agent': 'Notion Agent',
  'luna-content-creator': 'Luna',
  'zara-analytics-specialist': 'Zara',
  'viktor-publishing-specialist': 'Viktor',
  // Legacy aliases kept for backward compatibility
  'peter-workspace': 'Peter',
  'ami-assistant': 'Ami',
  'nora-community': 'Nora', // ✅ FIX: Legacy compatibility
}

export function getAgentDisplayName(id: string): string {
  const canonical = canonicalizeAgentId(id)
  
  // 0. PRIORITY: Check agent-metadata cache (updated by agent discovery)
  try {
    const { getAgentMetadata } = require('./agent-metadata')
    const metadata = getAgentMetadata(canonical) || getAgentMetadata(id)
    if (metadata?.name && metadata.name !== 'Agent') {
      return metadata.name
    }
  } catch {}
  
  // 1. Check predefined display names (fast path)
  if (AGENT_DISPLAY_NAMES[canonical] || AGENT_DISPLAY_NAMES[id]) {
    return AGENT_DISPLAY_NAMES[canonical] || AGENT_DISPLAY_NAMES[id]
  }

  // 2. Check runtime-registered dynamic agents (created at runtime)
  try {
    const g: any = globalThis as any
    const runtimeAgents: Map<string, any> | undefined = g.__cleoRuntimeAgents
    if (runtimeAgents && runtimeAgents instanceof Map) {
      const cfg = runtimeAgents.get(canonical) || runtimeAgents.get(id)
      if (cfg?.name && typeof cfg.name === 'string') {
        return cfg.name
      }
    }
  } catch {}
  
  // 3. For custom agents (UUIDs), try to get name from unified config
  if (canonical.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    try {
      const { getAllAgentsSync } = require('./unified-config')
      const agents = getAllAgentsSync()
      const agent = agents.find((a: any) => a.id === canonical || a.id === id)
      if (agent?.name) return agent.name
    } catch {
      // Fallback if sync method not available or errors
    }
  }
  
  // 3. Fallback to ID if nothing else works
  return id
}

export function isCanonicalAgentId(id: string): boolean {
  return canonicalizeAgentId(id) === id
}
