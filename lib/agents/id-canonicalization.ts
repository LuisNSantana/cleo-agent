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
  'peter-workspace': 'peter-google',
  'toby': 'toby-technical',
  'peter': 'peter-google',
  'ami': 'ami-creative',
  'apu': 'apu-research',
  'nora': 'nora-community',
  'astra': 'astra-email',
  'notion': 'notion-agent',
  'wex': 'wex-intelligence',
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
  'peter-google': 'Peter',
  'emma-ecommerce': 'Emma',
  'apu-research': 'Apu',
  'wex-intelligence': 'Wex',
  'nora-community': 'Nora',
  // Sub-agents
  'apu-markets': 'Apu Markets',
  'astra-email': 'Astra',
  'notion-agent': 'Notion Agent',
  'luna-content-creator': 'Luna',
  'zara-analytics-specialist': 'Zara',
  'viktor-publishing-specialist': 'Viktor',
  // Legacy aliases kept for backward compatibility
  'peter-workspace': 'Peter',
  'ami-assistant': 'Ami',
}

export function getAgentDisplayName(id: string): string {
  const canonical = canonicalizeAgentId(id)
  return AGENT_DISPLAY_NAMES[canonical] || AGENT_DISPLAY_NAMES[id] || id
}

export function isCanonicalAgentId(id: string): boolean {
  return canonicalizeAgentId(id) === id
}
