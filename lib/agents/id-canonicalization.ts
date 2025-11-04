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
  'toby': 'toby-technical',
  'peter': 'peter-financial',
  'ami': 'ami-creative',
  'apu': 'apu-support',
  // Legacy DB canonical that drifted from code; normalize to current canonical
  'apu-research': 'apu-support',
  'nora': 'nora-medical', // ✅ FIX: Was nora-community, should be nora-medical
  'nora-community': 'nora-medical', // ✅ FIX: Legacy alias
  'astra': 'astra-email',
  'notion': 'notion-agent',
  'wex': 'wex-intelligence',
  'iris': 'iris-insights', // ✅ FIX: Add Iris alias
  'jenn': 'jenn-community', // ✅ FIX: Add Jenn alias
}

export function canonicalizeAgentId(id: string): string {
  return AGENT_ID_ALIASES[id] || id
}

// Friendly display names for known agent IDs (canonical preferred)
const AGENT_DISPLAY_NAMES: Record<string, string> = {
  // Main agents
  'cleo-supervisor': 'Cleo',
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
  
  // 1. Check predefined display names first (fast path)
  if (AGENT_DISPLAY_NAMES[canonical] || AGENT_DISPLAY_NAMES[id]) {
    return AGENT_DISPLAY_NAMES[canonical] || AGENT_DISPLAY_NAMES[id]
  }
  
  // 2. For custom agents (UUIDs), try to get name from unified config
  // ✅ FIX: Custom agents should show their name, not UUID
  if (canonical.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    try {
      // Dynamic import to avoid circular dependencies
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
